import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { paging, firstOfMonth } from "../lib/http.js";
import { nextExpenseCode } from "../lib/ids.js";
import { serializeExpense } from "../lib/serialize.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

// ---- List -----------------------------------------------------------------
router.get("/", async (req, res) => {
  const { page, pageSize, skip, take } = paging(req);
  const where: Prisma.ExpenseWhereInput = { deletedAt: null };
  if (req.query.clientId) where.clientId = req.query.clientId as string;
  if (req.query.websiteId) where.websiteId = req.query.websiteId as string;
  if (req.query.category && req.query.category !== "All") where.category = req.query.category as string;
  const q = (req.query.q as string | undefined)?.trim();
  if (q) where.OR = [
    { code: { contains: q, mode: "insensitive" } },
    { vendor: { contains: q, mode: "insensitive" } },
    { description: { contains: q, mode: "insensitive" } },
  ];

  const [total, rows] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({ where, orderBy: { expenseDate: "desc" }, skip, take }),
  ]);
  res.json({ items: rows.map((e) => serializeExpense(e)), total, page, pageSize, pageCount: Math.ceil(total / pageSize) });
});

const baseExpense = z.object({
  expenseDate: z.coerce.date(),
  vendor: z.string().optional().nullable(),
  category: z.string().default("Other"),
  clientId: z.string().optional().nullable(),
  websiteId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  amount: z.coerce.number().min(0),
  method: z.string().optional().nullable(),
  recurring: z.coerce.boolean().optional(),
  renewalFrequency: z.string().optional().nullable(),
  nextRenewalDate: z.coerce.date().optional().nullable(),
  reimbursable: z.coerce.boolean().optional(),
  reimbursementStatus: z.string().optional(),
  receiptUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const upsert = baseExpense.refine((d) => !d.recurring || (d.renewalFrequency && d.nextRenewalDate), {
  message: "Recurring expenses need a renewal frequency and next renewal date",
  path: ["nextRenewalDate"],
});

router.post("/", async (req, res) => {
  const parsed = upsert.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data", details: parsed.error.flatten() });
  const b = parsed.data;
  const created = await prisma.$transaction(async (tx) => {
    const code = await nextExpenseCode(tx, b.expenseDate);
    return tx.expense.create({
      data: {
        code,
        expenseDate: b.expenseDate,
        expenseMonth: firstOfMonth(b.expenseDate),
        vendor: b.vendor ?? null,
        category: b.category,
        clientId: b.clientId || null,
        websiteId: b.websiteId || null,
        description: b.description ?? null,
        amount: b.amount,
        method: b.method ?? null,
        recurring: b.recurring ?? false,
        renewalFrequency: b.recurring ? b.renewalFrequency ?? null : null,
        nextRenewalDate: b.recurring ? b.nextRenewalDate ?? null : null,
        reimbursable: b.reimbursable ?? false,
        reimbursementStatus: b.reimbursementStatus ?? "Not Applicable",
        receiptUrl: b.receiptUrl ?? null,
        notes: b.notes ?? null,
      },
    });
  });
  await logActivity(req, "Expense", created.id, "create", `Added expense ${created.code}`);
  res.status(201).json({ expense: serializeExpense(created) });
});

router.patch("/:id", async (req, res) => {
  const parsed = baseExpense.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data" });
  const existing = await prisma.expense.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: "Expense not found" });
  const b: any = parsed.data;
  const data: any = {};
  for (const [k, v] of Object.entries(b)) if (v !== undefined) data[k] = v === "" ? null : v;
  if (data.expenseDate) data.expenseMonth = firstOfMonth(new Date(data.expenseDate));
  if (data.recurring === false) { data.renewalFrequency = null; data.nextRenewalDate = null; }
  const updated = await prisma.expense.update({ where: { id: existing.id }, data });
  await logActivity(req, "Expense", updated.id, "update", `Updated expense ${updated.code}`);
  res.json({ expense: serializeExpense(updated) });
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.expense.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: "Expense not found" });
  await prisma.expense.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
  await logActivity(req, "Expense", existing.id, "delete", `Archived expense ${existing.code}`);
  res.json({ ok: true });
});

export default router;
