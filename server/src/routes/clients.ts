import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { nextClientCode } from "../lib/ids.js";
import {
  serializeClient,
  serializeWebsite,
  serializeInvoice,
  serializePayment,
  serializeExpense,
  serializeTicket,
  type ClientRelations,
} from "../lib/serialize.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

// Relations needed to compute a client's derived aggregates.
const relInclude = {
  invoices: { where: { deletedAt: null }, include: { payments: { where: { deletedAt: null } } } },
  payments: { where: { deletedAt: null } },
  websites: { where: { deletedAt: null } },
  tickets: { where: { deletedAt: null } },
} satisfies Prisma.ClientInclude;

function relOf(c: any): ClientRelations {
  return { invoices: c.invoices, payments: c.payments, websites: c.websites, tickets: c.tickets };
}

const upsertSchema = z.object({
  businessName: z.string().min(1),
  contactName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  subscriptionStartDate: z.coerce.date().optional().nullable(),
  billingDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  monthlyFee: z.coerce.number().min(0).optional(),
  servicePlan: z.string().optional().nullable(),
  status: z.string().optional(),
  paymentMethod: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ---- List -----------------------------------------------------------------
router.get("/", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const status = req.query.status as string | undefined;
  const plan = req.query.plan as string | undefined;
  const sort = (req.query.sort as string) || "code";
  const order = req.query.order === "desc" ? "desc" : "asc";
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  const pageSize = Math.min(200, Math.max(1, parseInt((req.query.pageSize as string) || "50", 10)));

  const where: Prisma.ClientWhereInput = { deletedAt: null };
  if (status && status !== "All") where.status = status;
  if (plan && plan !== "All") where.servicePlan = plan;
  if (q) {
    where.OR = [
      { businessName: { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
    ];
  }

  const sortable: Record<string, Prisma.ClientOrderByWithRelationInput> = {
    code: { code: order },
    businessName: { businessName: order },
    monthlyFee: { monthlyFee: order },
    status: { status: order },
    createdAt: { createdAt: order },
  };

  const [total, rows] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      include: relInclude,
      orderBy: sortable[sort] ?? { code: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({
    items: rows.map((c) => serializeClient(c, relOf(c))),
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  });
});

// ---- Get one (full profile) ----------------------------------------------
router.get("/:id", async (req, res) => {
  const c = await prisma.client.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      ...relInclude,
      invoices: { where: { deletedAt: null }, include: { payments: { where: { deletedAt: null } } }, orderBy: { billingMonth: "desc" } },
      payments: { where: { deletedAt: null }, include: { invoice: true }, orderBy: { paymentDate: "desc" } },
      websites: { where: { deletedAt: null }, orderBy: { code: "asc" } },
      tickets: { where: { deletedAt: null }, include: { invoice: true }, orderBy: { requestedDate: "desc" } },
      expenses: { where: { deletedAt: null }, orderBy: { expenseDate: "desc" } },
    },
  });
  if (!c) return res.status(404).json({ error: "Client not found" });

  res.json({
    client: serializeClient(c, relOf(c)),
    websites: c.websites.map((w) => serializeWebsite(w)),
    invoices: c.invoices.map((i) => serializeInvoice(i)),
    payments: c.payments.map((p) => serializePayment(p)),
    tickets: c.tickets.map((t) => serializeTicket(t)),
    expenses: (c as any).expenses.map((e: any) => serializeExpense(e)),
  });
});

// ---- Create ---------------------------------------------------------------
router.post("/", async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });

  const created = await prisma.$transaction(async (tx) => {
    const code = await nextClientCode(tx);
    return tx.client.create({
      data: {
        code,
        businessName: parsed.data.businessName,
        contactName: parsed.data.contactName ?? null,
        phone: parsed.data.phone ?? null,
        website: parsed.data.website ?? null,
        city: parsed.data.city ?? null,
        subscriptionStartDate: parsed.data.subscriptionStartDate ?? null,
        billingDay: parsed.data.billingDay ?? null,
        monthlyFee: parsed.data.monthlyFee ?? 0,
        servicePlan: parsed.data.servicePlan ?? null,
        status: parsed.data.status ?? "Active",
        paymentMethod: parsed.data.paymentMethod ?? null,
        notes: parsed.data.notes ?? null,
      },
    });
  });
  await logActivity(req, "Client", created.id, "create", `Created client ${created.code} — ${created.businessName}`);
  res.status(201).json({ client: serializeClient(created) });
});

// ---- Update ---------------------------------------------------------------
router.patch("/:id", async (req, res) => {
  const parsed = upsertSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
  const existing = await prisma.client.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: "Client not found" });

  const updated = await prisma.client.update({
    where: { id: existing.id },
    data: {
      ...parsed.data,
      monthlyFee: parsed.data.monthlyFee ?? undefined,
    },
  });
  await logActivity(req, "Client", updated.id, "update", `Updated client ${updated.code}`);
  res.json({ client: serializeClient(updated) });
});

// ---- Pause / Cancel / Reactivate -----------------------------------------
router.post("/:id/pause", async (req, res) => {
  const existing = await prisma.client.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: "Client not found" });
  const updated = await prisma.client.update({
    where: { id: existing.id },
    data: { status: "Paused", pauseDate: new Date() },
  });
  await logActivity(req, "Client", updated.id, "pause", `Paused client ${updated.code}`);
  res.json({ client: serializeClient(updated) });
});

router.post("/:id/cancel", async (req, res) => {
  const existing = await prisma.client.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: "Client not found" });
  const updated = await prisma.client.update({
    where: { id: existing.id },
    data: { status: "Cancelled", cancellationDate: new Date() },
  });
  await logActivity(req, "Client", updated.id, "cancel", `Cancelled client ${updated.code}`);
  res.json({ client: serializeClient(updated) });
});

router.post("/:id/reactivate", async (req, res) => {
  const existing = await prisma.client.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: "Client not found" });
  const updated = await prisma.client.update({
    where: { id: existing.id },
    data: { status: "Active", pauseDate: null, cancellationDate: null },
  });
  await logActivity(req, "Client", updated.id, "reactivate", `Reactivated client ${updated.code}`);
  res.json({ client: serializeClient(updated) });
});

// ---- Soft delete (archive) ------------------------------------------------
router.delete("/:id", async (req, res) => {
  const existing = await prisma.client.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: "Client not found" });
  await prisma.client.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
  await logActivity(req, "Client", existing.id, "delete", `Archived client ${existing.code}`);
  res.json({ ok: true });
});

export default router;
