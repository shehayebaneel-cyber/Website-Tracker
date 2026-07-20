import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { toNum } from "../lib/calc.js";

const router = Router();

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

export default router;
