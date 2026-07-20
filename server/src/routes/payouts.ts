import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { parseMonthKey } from "../lib/http.js";
import { firstOfMonth, toNum, money, monthKey } from "../lib/calc.js";
import { requireSalesAdmin, nextPayoutCode } from "../lib/sales.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const lineInclude = {
  commissions: {
    include: { client: { select: { businessName: true, code: true } }, website: { select: { code: true, projectName: true } } },
    orderBy: { billingMonth: "asc" },
  },
  salesperson: { select: { fullName: true, code: true, paymentMethod: true, whishNumber: true } },
} satisfies Prisma.PayoutInclude;

function serialize(p: any, withLines = false) {
  const base = {
    id: p.id, code: p.code, salespersonId: p.salespersonId,
    salespersonName: p.salesperson?.fullName ?? null, salespersonCode: p.salesperson?.code ?? null,
    periodMonth: p.periodMonth, month: monthKey(p.periodMonth), status: p.status,
    totalEarned: toNum(p.totalEarned), totalHeld: toNum(p.totalHeld),
    totalAdjustments: toNum(p.totalAdjustments), netAmount: toNum(p.netAmount),
    paidDate: p.paidDate, method: p.method, reference: p.reference, proofUrl: p.proofUrl, notes: p.notes,
    lineCount: p.commissions?.length ?? undefined, createdAt: p.createdAt,
  };
  if (!withLines) return base;
  return {
    ...base,
    salespersonPaymentMethod: p.salesperson?.paymentMethod ?? null,
    salespersonWhish: p.salesperson?.whishNumber ?? null,
    lines: (p.commissions ?? []).map((c: any) => ({
      id: c.id, code: c.code, month: monthKey(c.billingMonth),
      clientName: c.client?.businessName ?? null, clientCode: c.client?.code ?? null,
      websiteCode: c.website?.code ?? null, websiteName: c.website?.projectName ?? null,
      subscriptionAmount: toNum(c.subscriptionAmount), amount: toNum(c.amount), status: c.status,
    })),
  };
}

// ---- List (scoped) --------------------------------------------------------
router.get("/", async (req, res) => {
  const where: Prisma.PayoutWhereInput = {};
  if (req.salespersonId) where.salespersonId = req.salespersonId;
  else if (req.query.salespersonId) where.salespersonId = req.query.salespersonId as string;
  if (req.query.status && req.query.status !== "All") where.status = req.query.status as string;
  const rows = await prisma.payout.findMany({ where, include: lineInclude, orderBy: { createdAt: "desc" } });
  res.json({ items: rows.map((p) => serialize(p)) });
});

// ---- Statement (scoped) ---------------------------------------------------
router.get("/:id", async (req, res) => {
  const p = await prisma.payout.findUnique({ where: { id: req.params.id }, include: lineInclude });
  if (!p) return res.status(404).json({ error: "Payout not found" });
  if (req.salespersonId && p.salespersonId !== req.salespersonId) return res.status(403).json({ error: "Not your payout" });
  res.json({ payout: serialize(p, true) });
});

// ---- Build a payout from approved commissions (admin) ----------------------
router.post("/build", requireSalesAdmin, async (req, res) => {
  const salespersonId = String(req.body?.salespersonId ?? "");
  if (!salespersonId) return res.status(400).json({ error: "salespersonId is required" });
  const period = parseMonthKey(req.body?.month) ?? firstOfMonth(new Date());

  const approved = await prisma.commission.findMany({ where: { salespersonId, status: "Approved", payoutId: null } });
  if (approved.length === 0) return res.status(400).json({ error: "This salesperson has no approved commissions waiting to be paid." });
  const totalEarned = money(approved.reduce((a, c) => a + toNum(c.amount), 0));

  const payout = await prisma.$transaction(async (tx) => {
    const code = await nextPayoutCode(tx, new Date());
    const p = await tx.payout.create({
      data: { code, salespersonId, periodMonth: period, status: "Under Review", totalEarned, totalAdjustments: 0, totalHeld: 0, netAmount: totalEarned },
    });
    await tx.commission.updateMany({ where: { id: { in: approved.map((c) => c.id) } }, data: { status: "Included in Payout", payoutId: p.id } });
    return p;
  });
  await logActivity(req, "Payout", payout.id, "build", `Built payout ${payout.code} (${approved.length} commissions, ${money(totalEarned)})`);
  const full = await prisma.payout.findUnique({ where: { id: payout.id }, include: lineInclude });
  res.status(201).json({ payout: serialize(full, true) });
});

// ---- Adjust (admin) -------------------------------------------------------
router.post("/:id/adjust", requireSalesAdmin, async (req, res) => {
  const schema = z.object({ amount: z.coerce.number(), note: z.string().optional().nullable() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "An adjustment amount is required" });
  const p = await prisma.payout.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: "Payout not found" });
  if (["Paid", "Cancelled"].includes(p.status)) return res.status(400).json({ error: `Cannot adjust a ${p.status} payout.` });
  const totalAdjustments = money(toNum(p.totalAdjustments) + parsed.data.amount);
  const netAmount = money(toNum(p.totalEarned) + totalAdjustments);
  const note = parsed.data.note ? `${p.notes ? p.notes + "\n" : ""}Adjustment ${money(parsed.data.amount)}: ${parsed.data.note}` : p.notes;
  const updated = await prisma.payout.update({ where: { id: p.id }, data: { totalAdjustments, netAmount, notes: note }, include: lineInclude });
  await logActivity(req, "Payout", p.id, "adjust", `Adjusted payout ${p.code} by ${money(parsed.data.amount)}`);
  res.json({ payout: serialize(updated, true) });
});

// ---- Mark paid (admin) ----------------------------------------------------
router.post("/:id/pay", requireSalesAdmin, async (req, res) => {
  const schema = z.object({ method: z.string().optional().nullable(), reference: z.string().optional().nullable(), proofUrl: z.string().optional().nullable(), paidDate: z.coerce.date().optional().nullable() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data" });
  const p = await prisma.payout.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: "Payout not found" });
  if (p.status === "Paid") return res.status(400).json({ error: "This payout is already paid." });
  if (p.status === "Cancelled") return res.status(400).json({ error: "This payout was cancelled." });

  const updated = await prisma.$transaction(async (tx) => {
    const up = await tx.payout.update({
      where: { id: p.id },
      data: { status: "Paid", paidDate: parsed.data.paidDate ?? new Date(), method: parsed.data.method ?? null, reference: parsed.data.reference ?? null, proofUrl: parsed.data.proofUrl ?? null },
      include: lineInclude,
    });
    await tx.commission.updateMany({ where: { payoutId: p.id }, data: { status: "Paid" } });
    return up;
  });
  await logActivity(req, "Payout", p.id, "pay", `Paid payout ${p.code} (${money(toNum(p.netAmount))})`);
  res.json({ payout: serialize(updated, true) });
});

// ---- Cancel a draft payout (admin) — releases its commissions -------------
router.post("/:id/cancel", requireSalesAdmin, async (req, res) => {
  const p = await prisma.payout.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: "Payout not found" });
  if (p.status === "Paid") return res.status(400).json({ error: "A paid payout cannot be cancelled here." });
  await prisma.$transaction(async (tx) => {
    await tx.commission.updateMany({ where: { payoutId: p.id }, data: { status: "Approved", payoutId: null } });
    await tx.payout.update({ where: { id: p.id }, data: { status: "Cancelled" } });
  });
  await logActivity(req, "Payout", p.id, "cancel", `Cancelled payout ${p.code}`);
  res.json({ ok: true });
});

export default router;
