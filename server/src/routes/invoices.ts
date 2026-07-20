import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { paging, parseMonthKey, firstOfMonth } from "../lib/http.js";
import { nextInvoiceCode } from "../lib/ids.js";
import { resolveDueDate, toNum, invoiceCalc, monthKey } from "../lib/calc.js";
import { serializeInvoice } from "../lib/serialize.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const invInclude = {
  payments: { where: { deletedAt: null } },
  client: { select: { businessName: true, code: true } },
  website: { select: { code: true, projectName: true } },
} satisfies Prisma.InvoiceInclude;

function withClient(i: any) {
  return {
    ...serializeInvoice(i),
    clientName: i.client.businessName,
    clientCode: i.client.code,
    websiteId: i.websiteId ?? null,
    websiteCode: i.website?.code ?? null,
    websiteName: i.website?.projectName ?? null,
  };
}

// ---- List -----------------------------------------------------------------
router.get("/", async (req, res) => {
  const { page, pageSize, skip, take } = paging(req);
  const where: Prisma.InvoiceWhereInput = { deletedAt: null };
  if (req.query.clientId) where.clientId = req.query.clientId as string;
  if (req.query.chargeType && req.query.chargeType !== "All") where.chargeType = req.query.chargeType as string;
  const bm = parseMonthKey(req.query.month);
  if (bm) where.billingMonth = bm;
  const q = (req.query.q as string | undefined)?.trim();
  if (q) where.OR = [
    { code: { contains: q, mode: "insensitive" } },
    { client: { businessName: { contains: q, mode: "insensitive" } } },
  ];

  const [total, rows] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({ where, include: invInclude, orderBy: { invoiceDate: "desc" }, skip, take }),
  ]);
  const items = rows.map(withClient);
  // status filter is derived, so apply after serialization for the current page
  const statusFilter = req.query.status as string | undefined;
  const filtered = statusFilter && statusFilter !== "All" ? items.filter((i) => i.status === statusFilter) : items;
  res.json({ items: filtered, total, page, pageSize, pageCount: Math.ceil(total / pageSize) });
});

router.get("/:id", async (req, res) => {
  const i = await prisma.invoice.findFirst({ where: { id: req.params.id, deletedAt: null }, include: invInclude });
  if (!i) return res.status(404).json({ error: "Invoice not found" });
  res.json({ invoice: withClient(i) });
});

// ---- Create ---------------------------------------------------------------
const createSchema = z.object({
  clientId: z.string().min(1),
  websiteId: z.string().optional().nullable(),
  chargeType: z.string().default("Monthly Subscription"),
  billingMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  invoiceDate: z.coerce.date().optional(),
  manualDueDate: z.coerce.date().optional().nullable(),
  amount: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).optional(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
  const b = parsed.data;

  const client = await prisma.client.findFirst({ where: { id: b.clientId, deletedAt: null } });
  if (!client) return res.status(400).json({ error: "Client not found" });

  const isSub = b.chargeType === "Monthly Subscription";
  const invoiceDate = b.invoiceDate ?? new Date();
  const billingMonth = b.billingMonth ? parseMonthKey(b.billingMonth)! : firstOfMonth(invoiceDate);

  // Subscriptions are per-website: each website carries its own $20/mo and is
  // billed on its own invoice, so eligibility/commission can be per-website.
  let website: Prisma.WebsiteGetPayload<{}> | null = null;
  if (isSub) {
    if (!b.websiteId) return res.status(400).json({ error: "A website is required for a monthly subscription invoice." });
    website = await prisma.website.findFirst({ where: { id: b.websiteId, clientId: client.id, deletedAt: null } });
    if (!website) return res.status(400).json({ error: "Website not found for this client" });
    const dup = await prisma.invoice.findFirst({
      where: { websiteId: website.id, chargeType: "Monthly Subscription", billingMonth, deletedAt: null },
    });
    if (dup) return res.status(409).json({ error: `A subscription invoice already exists for ${website.projectName ?? website.code} in ${monthKey(billingMonth)} (${dup.code}).` });
  } else if (b.websiteId) {
    // optional website link for a one-off charge
    website = await prisma.website.findFirst({ where: { id: b.websiteId, clientId: client.id, deletedAt: null } });
  }

  const amount = isSub ? toNum(website!.monthlyFee) : (b.amount ?? 0);
  if (!isSub && amount <= 0) return res.status(400).json({ error: "Amount is required for this charge type" });
  const dueDate = resolveDueDate(billingMonth, b.manualDueDate ?? null, isSub ? website!.billingDay : client.billingDay);

  const created = await prisma.$transaction(async (tx) => {
    const code = await nextInvoiceCode(tx, client.code, billingMonth);
    return tx.invoice.create({
      data: {
        code,
        clientId: client.id,
        websiteId: website?.id ?? null,
        invoiceDate,
        billingMonth,
        chargeType: b.chargeType,
        description: b.description ?? null,
        dueDate,
        amount,
        discount: b.discount ?? 0,
        notes: b.notes ?? null,
      },
      include: invInclude,
    });
  });
  await logActivity(req, "Invoice", created.id, "create", `Created invoice ${created.code} (${client.businessName})`);
  res.status(201).json({ invoice: withClient(created) });
});

// ---- Monthly generation: preview -----------------------------------------
// Subscriptions are per-website: one invoice per active website per month.
function activeWebsiteWhere(includeTrial: boolean): Prisma.WebsiteWhereInput {
  return {
    deletedAt: null,
    subscriptionActive: true,
    client: { deletedAt: null, status: includeTrial ? { in: ["Active", "Trial"] } : "Active" },
  };
}

router.post("/generate/preview", async (req, res) => {
  const bm = parseMonthKey(req.body?.month);
  if (!bm) return res.status(400).json({ error: "month (YYYY-MM) is required" });
  const includeTrial = !!req.body?.includeTrial;

  const websites = await prisma.website.findMany({
    where: activeWebsiteWhere(includeTrial),
    include: { client: { select: { code: true, businessName: true, status: true } } },
    orderBy: { code: "asc" },
  });
  const existing = await prisma.invoice.findMany({
    where: { chargeType: "Monthly Subscription", billingMonth: bm, deletedAt: null, websiteId: { not: null } },
    select: { websiteId: true, code: true },
  });
  const existMap = new Map(existing.map((e) => [e.websiteId, e.code]));

  const rows = websites.map((w) => ({
    websiteId: w.id,
    websiteCode: w.code,
    websiteName: w.projectName,
    clientId: w.clientId,
    clientCode: w.client.code,
    businessName: w.client.businessName,
    monthlyFee: toNum(w.monthlyFee),
    status: w.client.status,
    alreadyInvoiced: existMap.has(w.id),
    existingCode: existMap.get(w.id) ?? null,
    eligible: !existMap.has(w.id) && toNum(w.monthlyFee) > 0,
  }));
  res.json({ month: monthKey(bm), rows });
});

// ---- Monthly generation: generate ----------------------------------------
router.post("/generate", async (req, res) => {
  const bm = parseMonthKey(req.body?.month);
  if (!bm) return res.status(400).json({ error: "month (YYYY-MM) is required" });
  const websiteIds: string[] | undefined = Array.isArray(req.body?.websiteIds) ? req.body.websiteIds : undefined;

  const websites = await prisma.website.findMany({
    where: {
      ...activeWebsiteWhere(true),
      ...(websiteIds ? { id: { in: websiteIds } } : {}),
    },
    include: { client: { select: { code: true } } },
    orderBy: { code: "asc" },
  });

  const created: string[] = [];
  const skipped: { code: string; reason: string }[] = [];

  for (const w of websites) {
    const fee = toNum(w.monthlyFee);
    if (fee <= 0) { skipped.push({ code: w.code, reason: "no monthly fee" }); continue; }
    const dup = await prisma.invoice.findFirst({
      where: { websiteId: w.id, chargeType: "Monthly Subscription", billingMonth: bm, deletedAt: null },
    });
    if (dup) { skipped.push({ code: w.code, reason: "already invoiced" }); continue; }

    await prisma.$transaction(async (tx) => {
      const code = await nextInvoiceCode(tx, w.client.code, bm);
      await tx.invoice.create({
        data: {
          code,
          clientId: w.clientId,
          websiteId: w.id,
          invoiceDate: new Date(),
          billingMonth: bm,
          chargeType: "Monthly Subscription",
          description: "Monthly website subscription",
          dueDate: resolveDueDate(bm, null, w.billingDay),
          amount: fee,
          discount: 0,
        },
      });
      created.push(code);
    });
  }
  await logActivity(req, "Invoice", null, "generate", `Generated ${created.length} invoice(s) for ${monthKey(bm)}`);
  res.json({ month: monthKey(bm), created, skipped });
});

// ---- Update ---------------------------------------------------------------
const updateSchema = z.object({
  description: z.string().optional().nullable(),
  discount: z.coerce.number().min(0).optional(),
  amount: z.coerce.number().min(0).optional(),
  manualDueDate: z.coerce.date().optional().nullable(),
  reminderStatus: z.string().optional(),
  notes: z.string().optional().nullable(),
});

router.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
  const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: "Invoice not found" });

  const data: Prisma.InvoiceUpdateInput = {};
  const b = parsed.data;
  if (b.description !== undefined) data.description = b.description;
  if (b.discount !== undefined) data.discount = b.discount;
  // amount editable only for non-subscription charges (subs are snapshots of the fee)
  if (b.amount !== undefined && existing.chargeType !== "Monthly Subscription") data.amount = b.amount;
  if (b.manualDueDate !== undefined && b.manualDueDate) data.dueDate = b.manualDueDate;
  if (b.reminderStatus !== undefined) { data.reminderStatus = b.reminderStatus; data.lastReminderDate = new Date(); }
  if (b.notes !== undefined) data.notes = b.notes;

  const updated = await prisma.invoice.update({ where: { id: existing.id }, data, include: invInclude });
  await logActivity(req, "Invoice", updated.id, "update", `Updated invoice ${updated.code}`);
  res.json({ invoice: withClient(updated) });
});

// ---- Soft delete ----------------------------------------------------------
router.delete("/:id", async (req, res) => {
  const existing = await prisma.invoice.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { payments: { where: { deletedAt: null } } },
  });
  if (!existing) return res.status(404).json({ error: "Invoice not found" });
  const calc = invoiceCalc({
    amount: toNum(existing.amount), discount: toNum(existing.discount), chargeType: existing.chargeType,
    dueDate: existing.dueDate, payments: existing.payments.map((p) => ({ amount: toNum(p.amount), paymentDate: p.paymentDate })),
  });
  if (calc.amountPaid > 0) return res.status(409).json({ error: "Cannot archive an invoice that has payments. Remove the payments first." });
  await prisma.invoice.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
  await logActivity(req, "Invoice", existing.id, "delete", `Archived invoice ${existing.code}`);
  res.json({ ok: true });
});

export default router;
