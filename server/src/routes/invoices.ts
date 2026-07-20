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
} satisfies Prisma.InvoiceInclude;

function withClient(i: any) {
  return { ...serializeInvoice(i), clientName: i.client.businessName, clientCode: i.client.code };
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

  if (isSub) {
    const dup = await prisma.invoice.findFirst({
      where: { clientId: client.id, chargeType: "Monthly Subscription", billingMonth, deletedAt: null },
    });
    if (dup) return res.status(409).json({ error: `A subscription invoice already exists for ${client.businessName} in ${monthKey(billingMonth)} (${dup.code}).` });
  }

  const amount = isSub ? toNum(client.monthlyFee) : (b.amount ?? 0);
  if (!isSub && amount <= 0) return res.status(400).json({ error: "Amount is required for this charge type" });
  const dueDate = resolveDueDate(billingMonth, b.manualDueDate ?? null, client.billingDay);

  const created = await prisma.$transaction(async (tx) => {
    const code = await nextInvoiceCode(tx, client.code, billingMonth);
    return tx.invoice.create({
      data: {
        code,
        clientId: client.id,
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
router.post("/generate/preview", async (req, res) => {
  const bm = parseMonthKey(req.body?.month);
  if (!bm) return res.status(400).json({ error: "month (YYYY-MM) is required" });
  const includeTrial = !!req.body?.includeTrial;

  const clients = await prisma.client.findMany({
    where: {
      deletedAt: null,
      status: includeTrial ? { in: ["Active", "Trial"] } : "Active",
    },
    orderBy: { code: "asc" },
  });
  const existing = await prisma.invoice.findMany({
    where: { chargeType: "Monthly Subscription", billingMonth: bm, deletedAt: null },
    select: { clientId: true, code: true },
  });
  const existMap = new Map(existing.map((e) => [e.clientId, e.code]));

  const rows = clients.map((c) => ({
    clientId: c.id,
    clientCode: c.code,
    businessName: c.businessName,
    monthlyFee: toNum(c.monthlyFee),
    status: c.status,
    alreadyInvoiced: existMap.has(c.id),
    existingCode: existMap.get(c.id) ?? null,
    eligible: !existMap.has(c.id) && toNum(c.monthlyFee) > 0,
  }));
  res.json({ month: monthKey(bm), rows });
});

// ---- Monthly generation: generate ----------------------------------------
router.post("/generate", async (req, res) => {
  const bm = parseMonthKey(req.body?.month);
  if (!bm) return res.status(400).json({ error: "month (YYYY-MM) is required" });
  const clientIds: string[] | undefined = Array.isArray(req.body?.clientIds) ? req.body.clientIds : undefined;

  const clients = await prisma.client.findMany({
    where: {
      deletedAt: null,
      status: { in: ["Active", "Trial"] },
      ...(clientIds ? { id: { in: clientIds } } : {}),
    },
    orderBy: { code: "asc" },
  });

  const created: string[] = [];
  const skipped: { code: string; reason: string }[] = [];

  for (const c of clients) {
    const fee = toNum(c.monthlyFee);
    if (fee <= 0) { skipped.push({ code: c.code, reason: "no monthly fee" }); continue; }
    const dup = await prisma.invoice.findFirst({
      where: { clientId: c.id, chargeType: "Monthly Subscription", billingMonth: bm, deletedAt: null },
    });
    if (dup) { skipped.push({ code: c.code, reason: "already invoiced" }); continue; }

    await prisma.$transaction(async (tx) => {
      const code = await nextInvoiceCode(tx, c.code, bm);
      await tx.invoice.create({
        data: {
          code,
          clientId: c.id,
          invoiceDate: new Date(),
          billingMonth: bm,
          chargeType: "Monthly Subscription",
          description: "Monthly website subscription",
          dueDate: resolveDueDate(bm, null, c.billingDay),
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
