import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { parseMonthKey } from "../lib/http.js";
import { toNum, money, monthKey } from "../lib/calc.js";
import { requireSalesAdmin } from "../lib/sales.js";
import { generateCommissions } from "../lib/commissions.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const cInclude = {
  client: { select: { businessName: true, code: true } },
  website: { select: { code: true, projectName: true } },
  salesperson: { select: { fullName: true, code: true } },
} satisfies Prisma.CommissionInclude;

function serialize(c: any) {
  return {
    id: c.id,
    code: c.code,
    websiteId: c.websiteId,
    websiteCode: c.website?.code ?? null,
    websiteName: c.website?.projectName ?? null,
    clientId: c.clientId,
    clientName: c.client?.businessName ?? null,
    clientCode: c.client?.code ?? null,
    salespersonId: c.salespersonId,
    salespersonName: c.salesperson?.fullName ?? null,
    salespersonCode: c.salesperson?.code ?? null,
    billingMonth: c.billingMonth,
    month: monthKey(c.billingMonth),
    basis: c.basis,
    method: c.method,
    subscriptionAmount: toNum(c.subscriptionAmount),
    amount: toNum(c.amount),
    adjustment: toNum(c.adjustment),
    status: c.status,
    statusReason: c.statusReason,
    approvedAt: c.approvedAt,
    approvedBy: c.approvedBy,
    heldReason: c.heldReason,
    payoutId: c.payoutId,
    createdAt: c.createdAt,
  };
}

// A commission counts toward "expected earnings" unless it was cancelled/reversed.
const COUNTS = (s: string) => s !== "Cancelled" && s !== "Reversed";

function summarize(rows: { status: string; amount: number }[]) {
  const sum = (pred: (s: string) => boolean) => money(rows.filter((r) => pred(r.status)).reduce((a, r) => a + r.amount, 0));
  return {
    count: rows.length,
    expected: sum(COUNTS),
    eligible: sum((s) => s === "Eligible"),
    approved: sum((s) => s === "Approved" || s === "Included in Payout"),
    paid: sum((s) => s === "Paid"),
    underReview: sum((s) => s === "Under Review"),
    held: sum((s) => s === "Held"),
    waiting: sum((s) => s === "Waiting for Client Payment" || s === "Expected"),
  };
}

// ---- List (scoped: a salesperson sees only their own) ---------------------
router.get("/", async (req, res) => {
  const where: Prisma.CommissionWhereInput = {};
  if (req.salespersonId) where.salespersonId = req.salespersonId;
  else if (req.query.salespersonId) where.salespersonId = req.query.salespersonId as string;
  const bm = parseMonthKey(req.query.month);
  if (bm) where.billingMonth = bm;
  if (req.query.status && req.query.status !== "All") where.status = req.query.status as string;

  const rows = await prisma.commission.findMany({ where, include: cInclude, orderBy: [{ billingMonth: "desc" }, { code: "asc" }] });
  const items = rows.map(serialize);
  res.json({ items, summary: summarize(items.map((i) => ({ status: i.status, amount: i.amount }))) });
});

// ---- Generate / refresh a month (admin) -----------------------------------
router.post("/generate", requireSalesAdmin, async (req, res) => {
  const bm = parseMonthKey(req.body?.month);
  if (!bm) return res.status(400).json({ error: "month (YYYY-MM) is required" });
  const salespersonId = typeof req.body?.salespersonId === "string" ? req.body.salespersonId : undefined;
  const results = await generateCommissions(bm, salespersonId ? { salespersonId } : undefined);
  const created = results.filter((r) => !r.kept).length;
  await logActivity(req, "Commission", null, "generate", `Generated/refreshed ${results.length} commission row(s) for ${monthKey(bm)}`);
  res.json({ month: monthKey(bm), total: results.length, created, byStatus: tally(results.map((r) => r.status)) });
});

function tally(statuses: string[]) {
  const m: Record<string, number> = {};
  for (const s of statuses) m[s] = (m[s] ?? 0) + 1;
  return m;
}

// ---- Owner actions --------------------------------------------------------
async function load(id: string) {
  return prisma.commission.findUnique({ where: { id }, include: cInclude });
}

router.post("/:id/approve", requireSalesAdmin, async (req, res) => {
  const c = await prisma.commission.findUnique({ where: { id: req.params.id } });
  if (!c) return res.status(404).json({ error: "Commission not found" });
  if (!["Eligible", "Under Review", "Held"].includes(c.status)) {
    return res.status(400).json({ error: `Only Eligible / Under Review / Held commissions can be approved (this one is ${c.status}).` });
  }
  await prisma.commission.update({
    where: { id: c.id },
    data: { status: "Approved", approvedAt: new Date(), approvedBy: req.user?.email ?? null, statusReason: null, heldReason: null },
  });
  await logActivity(req, "Commission", c.id, "approve", `Approved commission ${c.code}`);
  res.json({ commission: serialize(await load(c.id)) });
});

router.post("/:id/hold", requireSalesAdmin, async (req, res) => {
  const c = await prisma.commission.findUnique({ where: { id: req.params.id } });
  if (!c) return res.status(404).json({ error: "Commission not found" });
  if (["Paid", "Included in Payout"].includes(c.status)) return res.status(400).json({ error: `Cannot hold a ${c.status} commission.` });
  await prisma.commission.update({ where: { id: c.id }, data: { status: "Held", heldReason: req.body?.reason ?? null } });
  await logActivity(req, "Commission", c.id, "hold", `Held commission ${c.code}`);
  res.json({ commission: serialize(await load(c.id)) });
});

// Release a held commission back into the normal flow (next generate re-derives it).
router.post("/:id/release", requireSalesAdmin, async (req, res) => {
  const c = await prisma.commission.findUnique({ where: { id: req.params.id } });
  if (!c) return res.status(404).json({ error: "Commission not found" });
  if (c.status !== "Held") return res.status(400).json({ error: "Only a held commission can be released." });
  await prisma.commission.update({ where: { id: c.id }, data: { status: "Under Review", heldReason: null, statusReason: "Released for review" } });
  await logActivity(req, "Commission", c.id, "release", `Released commission ${c.code}`);
  res.json({ commission: serialize(await load(c.id)) });
});

router.post("/:id/reverse", requireSalesAdmin, async (req, res) => {
  const c = await prisma.commission.findUnique({ where: { id: req.params.id } });
  if (!c) return res.status(404).json({ error: "Commission not found" });
  if (c.status === "Paid") return res.status(400).json({ error: "A paid commission cannot be reversed here." });
  await prisma.commission.update({ where: { id: c.id }, data: { status: "Reversed", reversedAt: new Date(), statusReason: req.body?.reason ?? null } });
  await logActivity(req, "Commission", c.id, "reverse", `Reversed commission ${c.code}`);
  res.json({ commission: serialize(await load(c.id)) });
});

export default router;
