import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/db.js";
import { toNum, money, firstOfMonth, monthKey, startOfDay } from "../lib/calc.js";
import { serializeInvoice, serializePayment } from "../lib/serialize.js";
import { friendlyStatus } from "../lib/sales.js";

const router = Router();

// Resolve the logged-in CLIENT to their Client record and stash it.
async function loadClient(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "CLIENT") return res.status(403).json({ error: "This area is for clients." });
  const client = await prisma.client.findFirst({ where: { userId: req.user.uid, deletedAt: null } });
  if (!client) return res.status(403).json({ error: "No client account is linked to this login." });
  res.locals.client = client;
  next();
}
router.use(loadClient);

const UPDATE_CATEGORIES = new Set(["Content Change", "Design Change"]);

function nextPaymentDate(billingDay: number, from: Date): Date {
  const day = Math.min(Math.max(billingDay || 1, 1), 28);
  let d = new Date(from.getFullYear(), from.getMonth(), day);
  if (startOfDay(d) < startOfDay(from)) d = new Date(from.getFullYear(), from.getMonth() + 1, day);
  return d;
}

function ticketDto(t: any) {
  return {
    id: t.id, code: t.code, summary: t.summary, requestType: t.requestType, category: t.category,
    priority: t.priority, status: friendlyStatus(t.status), rawStatus: t.status,
    requestedDate: t.requestedDate, completedDate: t.completedDate,
  };
}

// ---- Overview -------------------------------------------------------------
router.get("/me", async (_req, res) => {
  const client = res.locals.client;
  const now = new Date();
  const curKey = monthKey(firstOfMonth(now));

  const [websites, invoices, payments, tickets, assignment] = await Promise.all([
    prisma.website.findMany({ where: { clientId: client.id, deletedAt: null }, orderBy: { code: "asc" } }),
    prisma.invoice.findMany({ where: { clientId: client.id, deletedAt: null }, include: { payments: { where: { deletedAt: null } } }, orderBy: { invoiceDate: "desc" } }),
    prisma.payment.findMany({ where: { clientId: client.id, deletedAt: null }, include: { invoice: true }, orderBy: { paymentDate: "desc" } }),
    prisma.supportTicket.findMany({ where: { clientId: client.id, deletedAt: null }, orderBy: { requestedDate: "desc" } }),
    prisma.clientAssignment.findFirst({ where: { clientId: client.id, status: "Active" }, include: { currentSalesperson: { select: { fullName: true, phone: true, whishNumber: true } } } }),
  ]);

  const websiteDtos = websites.map((w) => {
    const used = tickets.filter((t) => t.websiteId === w.id && t.category && UPDATE_CATEGORIES.has(t.category) && monthKey(t.requestedDate) === curKey).length;
    return {
      id: w.id, code: w.code, projectName: w.projectName, primaryUrl: w.primaryUrl, status: w.status,
      monthlyFee: toNum(w.monthlyFee), billingDay: w.billingDay, subscriptionActive: w.subscriptionActive,
      nextPaymentDate: w.subscriptionActive ? nextPaymentDate(w.billingDay, now) : null,
      includedUpdates: w.includedUpdatesPerMonth, updatesUsed: used,
    };
  });

  const invoiceDtos = invoices.map((i) => serializeInvoice(i));
  const balance = money(invoiceDtos.reduce((a, i) => a + Math.max(i.balance, 0), 0));
  const monthlyTotal = money(websites.filter((w) => w.subscriptionActive).reduce((a, w) => a + toNum(w.monthlyFee), 0));
  const curSubs = invoiceDtos.filter((i) => i.chargeType === "Monthly Subscription" && monthKey(i.billingMonth) === curKey);
  const paidThisMonth = curSubs.length > 0 && curSubs.every((i) => i.balance <= 0);
  const nextDates = websiteDtos.map((w) => w.nextPaymentDate).filter(Boolean) as Date[];
  const nextPayment = nextDates.length ? nextDates.reduce((a, b) => (a < b ? a : b)) : null;

  const open = tickets.filter((t) => !["Completed", "Cancelled"].includes(t.status));
  const closed = tickets.filter((t) => ["Completed", "Cancelled"].includes(t.status));

  res.json({
    client: { code: client.code, businessName: client.businessName, contactName: client.contactName, servicePlan: client.servicePlan, status: client.status },
    subscription: { monthlyTotal, balance, paidThisMonth, nextPaymentDate: nextPayment },
    websites: websiteDtos,
    invoices: invoiceDtos,
    payments: payments.map((p) => serializePayment(p)),
    rep: assignment?.currentSalesperson
      ? { name: assignment.currentSalesperson.fullName, phone: assignment.currentSalesperson.phone, whish: assignment.currentSalesperson.whishNumber }
      : null,
    openRequests: open.map(ticketDto),
    closedRequests: closed.map(ticketDto),
  });
});

export default router;
