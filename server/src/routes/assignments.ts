import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { toNum, firstOfMonth } from "../lib/calc.js";
import { requireSalesAdmin } from "../lib/sales.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const LOCKED_COMM = ["Approved", "Included in Payout", "Paid", "Held"];

function serialize(a: any) {
  return {
    id: a.id, code: a.code, clientId: a.clientId, clientName: a.client?.businessName ?? null,
    clientCode: a.client?.code ?? null, websiteId: a.websiteId, websiteCode: a.website?.code ?? null,
    originalSalespersonId: a.originalSalespersonId, originalSalespersonName: a.originalSalesperson?.fullName ?? null,
    currentSalespersonId: a.currentSalespersonId, currentSalespersonName: a.currentSalesperson?.fullName ?? null,
    startDate: a.startDate, endDate: a.endDate, effectiveBillingMonth: a.effectiveBillingMonth, status: a.status,
    transferReason: a.transferReason, monthlyFee: a.client ? toNum(a.client.monthlyFee) : null,
    commissionMethod: a.commissionMethod, commissionAmount: a.commissionAmount != null ? toNum(a.commissionAmount) : null,
    commissionPercent: a.commissionPercent != null ? toNum(a.commissionPercent) : null,
  };
}

const include = {
  client: { select: { businessName: true, code: true, monthlyFee: true } },
  website: { select: { code: true } },
  originalSalesperson: { select: { fullName: true } },
  currentSalesperson: { select: { fullName: true } },
} satisfies Prisma.ClientAssignmentInclude;

router.get("/", async (req, res) => {
  const where: Prisma.ClientAssignmentWhereInput = {};
  if (req.salespersonId) where.currentSalespersonId = req.salespersonId;
  else if (req.query.salespersonId) where.currentSalespersonId = req.query.salespersonId as string;
  if (req.query.clientId) { where.clientId = req.query.clientId as string; delete where.currentSalespersonId; }
  if (req.query.status && req.query.status !== "All") where.status = req.query.status as string;
  else if (!req.query.clientId) where.status = "Active"; // default to active unless viewing a client's full history

  const rows = await prisma.clientAssignment.findMany({ where, include, orderBy: { startDate: "desc" } });
  res.json({ items: rows.map(serialize) });
});

// ---- Reassign a client to another salesperson (admin) ---------------------
// Keeps the original bringer; future commission goes to the new manager. You
// choose who earns the transition month's (not-yet-approved) commissions.
router.post("/:id/transfer", requireSalesAdmin, async (req, res) => {
  const schema = z.object({
    toSalespersonId: z.string().min(1),
    transitionMonthRecipient: z.enum(["current", "new"]).default("new"),
    reason: z.string().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data" });
  const b = parsed.data;

  const asg = await prisma.clientAssignment.findFirst({ where: { id: req.params.id, status: "Active" }, include: { client: { select: { businessName: true } } } });
  if (!asg) return res.status(404).json({ error: "Active assignment not found" });
  if (asg.currentSalespersonId === b.toSalespersonId) return res.status(400).json({ error: "This client is already managed by that salesperson." });
  const to = await prisma.salesperson.findFirst({ where: { id: b.toSalespersonId, deletedAt: null, status: "Active" } });
  if (!to) return res.status(400).json({ error: "Choose an active salesperson to transfer to." });

  const fromId = asg.currentSalespersonId;
  const curMonth = firstOfMonth(new Date());

  await prisma.$transaction(async (tx) => {
    await tx.clientAssignment.update({ where: { id: asg.id }, data: { currentSalespersonId: b.toSalespersonId, transferReason: b.reason ?? null } });
    // The transition month's un-finalised commissions credit whoever you chose.
    if (b.transitionMonthRecipient === "new") {
      await tx.commission.updateMany({
        where: { clientId: asg.clientId, billingMonth: curMonth, status: { notIn: LOCKED_COMM }, salespersonId: fromId },
        data: { salespersonId: b.toSalespersonId },
      });
    }
  });
  await logActivity(req, "ClientAssignment", asg.id, "transfer", `Reassigned ${asg.client.businessName} to ${to.fullName}`);
  const full = await prisma.clientAssignment.findUnique({ where: { id: asg.id }, include });
  res.json({ assignment: serialize(full) });
});

export default router;
