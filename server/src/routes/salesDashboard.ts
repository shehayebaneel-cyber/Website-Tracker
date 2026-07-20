import { Router } from "express";
import { prisma } from "../lib/db.js";
import { invoiceCalc, toNum, money, firstOfMonth, monthKey, startOfDay } from "../lib/calc.js";

const router = Router();

const ACTIVE_LEAD = new Set(["New", "Contacted", "Interested", "Meeting Scheduled", "Proposal Sent", "Negotiating", "Waiting for Client", "Follow Up Later"]);

// Map clientId -> whether their current-month subscription is fully paid.
async function currentMonthPaid(now: Date) {
  const curKey = monthKey(firstOfMonth(now));
  const invoices = await prisma.invoice.findMany({
    where: { deletedAt: null, chargeType: "Monthly Subscription" },
    include: { payments: { where: { deletedAt: null } } },
  });
  const paid = new Map<string, boolean>();
  for (const i of invoices) {
    if (monthKey(i.billingMonth) !== curKey) continue;
    const c = invoiceCalc({ amount: toNum(i.amount), discount: toNum(i.discount), chargeType: i.chargeType, dueDate: i.dueDate, payments: i.payments.map((p) => ({ amount: toNum(p.amount), paymentDate: p.paymentDate })) }, now);
    paid.set(i.clientId, c.balance <= 0);
  }
  return paid;
}

router.get("/", async (req, res) => {
  const now = new Date();
  const today = startOfDay(now);
  const curKey = monthKey(firstOfMonth(now));
  const paidMap = await currentMonthPaid(now);

  // ===== salesperson view =====
  if (req.salespersonId) {
    const spId = req.salespersonId;
    const [sp, leads, assignments] = await Promise.all([
      prisma.salesperson.findUnique({ where: { id: spId } }),
      prisma.lead.findMany({ where: { salespersonId: spId, deletedAt: null }, orderBy: { nextFollowUpDate: "asc" } }),
      prisma.clientAssignment.findMany({ where: { currentSalespersonId: spId, status: "Active" }, include: { client: true } }),
    ]);
    const commAmount = sp ? toNum(sp.commissionAmount) : 5;

    const leadsToFollowUp = leads.filter((l) => ACTIVE_LEAD.has(l.status) && l.nextFollowUpDate && startOfDay(l.nextFollowUpDate) <= today)
      .map((l) => ({ id: l.id, code: l.code, businessName: l.businessName, status: l.status, phone: l.phone, whatsapp: l.whatsapp, nextFollowUpDate: l.nextFollowUpDate }));

    let paying = 0;
    const assignedClients = assignments.map((a) => {
      const isPaid = paidMap.get(a.clientId) ?? false;
      if (isPaid) paying++;
      return { assignmentId: a.id, clientId: a.clientId, businessName: a.client.businessName, monthlyFee: toNum(a.client.monthlyFee), paidThisMonth: isPaid };
    });

    // Real commission rows for the current month (this salesperson only).
    const comms = await prisma.commission.findMany({ where: { salespersonId: spId, billingMonth: firstOfMonth(now) } });
    const csum = (pred: (s: string) => boolean) => money(comms.filter((c) => pred(c.status)).reduce((a, c) => a + toNum(c.amount), 0));

    return res.json({
      mode: "salesperson",
      cards: {
        activeLeads: leads.filter((l) => ACTIVE_LEAD.has(l.status)).length,
        followUpsDue: leadsToFollowUp.length,
        assignedClients: assignments.length,
        paidClients: paying,
        unpaidClients: assignments.length - paying,
        expectedCommission: money(paying * commAmount),
        eligibleCommission: csum((s) => s === "Eligible"),
        approvedCommission: csum((s) => s === "Approved" || s === "Included in Payout"),
        heldCommission: csum((s) => s === "Held"),
        paidCommission: csum((s) => s === "Paid"),
      },
      leadsToFollowUp,
      assignedClients,
      commissionNote: comms.length === 0
        ? "No commissions generated for this month yet."
        : "A commission becomes Eligible once the website subscription is paid and you have logged the monthly follow-up.",
    });
  }

  // ===== admin / manager view =====
  const [salespeople, leads, assignments] = await Promise.all([
    prisma.salesperson.findMany({ where: { deletedAt: null } }),
    prisma.lead.findMany({ where: { deletedAt: null } }),
    prisma.clientAssignment.findMany({ where: { status: "Active" }, include: { client: true, currentSalesperson: { select: { fullName: true } } } }),
  ]);

  const activeSalespeople = salespeople.filter((s) => s.status === "Active");
  const newLeadsThisMonth = leads.filter((l) => monthKey(l.dateAdded) === curKey).length;
  const dealsWonThisMonth = leads.filter((l) => l.status === "Won" && monthKey(l.updatedAt) === curKey).length;

  let payingWebsites = 0, unpaidClients = 0, subRevenue = 0, expectedCommission = 0;
  const bySalesperson = new Map<string, { name: string; clients: number; paying: number; revenue: number; commission: number }>();
  const spDefault = new Map(salespeople.map((s) => [s.id, toNum(s.commissionAmount)]));

  for (const a of assignments) {
    const isPaid = paidMap.get(a.clientId) ?? false;
    const fee = toNum(a.client.monthlyFee);
    subRevenue += fee;
    const comm = a.commissionAmount != null ? toNum(a.commissionAmount) : (spDefault.get(a.currentSalespersonId) ?? 5);
    if (isPaid) { payingWebsites++; expectedCommission += comm; } else unpaidClients++;

    const e = bySalesperson.get(a.currentSalespersonId) ?? { name: a.currentSalesperson.fullName, clients: 0, paying: 0, revenue: 0, commission: 0 };
    e.clients++; e.revenue += fee;
    if (isPaid) { e.paying++; e.commission += comm; }
    bySalesperson.set(a.currentSalespersonId, e);
  }

  // new clients by month (last 6) via assignment start
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  const newClientsByMonth = months.map((k) => ({ month: k, count: assignments.filter((a) => monthKey(a.startDate) === k).length }));

  // Real commission totals across the team for the current month.
  const allComms = await prisma.commission.findMany({ where: { billingMonth: firstOfMonth(now) } });
  const acsum = (pred: (s: string) => boolean) => money(allComms.filter((c) => pred(c.status)).reduce((a, c) => a + toNum(c.amount), 0));
  const approvedCommission = acsum((s) => s === "Approved" || s === "Included in Payout");
  const paidCommission = acsum((s) => s === "Paid");

  res.json({
    mode: "admin",
    cards: {
      activeSalespeople: activeSalespeople.length,
      totalActiveLeads: leads.filter((l) => ACTIVE_LEAD.has(l.status)).length,
      newLeadsThisMonth,
      dealsWonThisMonth,
      newClientsThisMonth: assignments.filter((a) => monthKey(a.startDate) === curKey).length,
      activePayingWebsites: payingWebsites,
      monthlySubscriptionRevenue: money(subRevenue),
      expectedCommissionThisMonth: money(expectedCommission),
      approvedCommission,
      paidCommission,
      owedToTeam: money(approvedCommission - paidCommission),
      companyRevenueAfterCommission: money(subRevenue - expectedCommission),
      unpaidClients,
    },
    breakdowns: {
      bySalesperson: [...bySalesperson.values()].map((v) => ({ name: v.name, clients: v.clients, paying: v.paying, revenue: money(v.revenue), commission: money(v.commission) })),
      newClientsByMonth,
    },
  });
});

export default router;
