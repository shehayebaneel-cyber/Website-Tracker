import { Router } from "express";
import { prisma } from "../lib/db.js";
import {
  invoiceCalc,
  renewalStatus,
  deadlineStatus,
  toNum,
  money,
  monthKey,
  firstOfMonth,
  daysUntil,
} from "../lib/calc.js";

const router = Router();

function parseMonth(v: unknown, fallback: Date): Date {
  if (typeof v === "string" && /^\d{4}-\d{2}$/.test(v)) {
    const [y, m] = v.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }
  return firstOfMonth(fallback);
}

router.get("/", async (req, res) => {
  const now = new Date();
  const sel = parseMonth(req.query.month, now);
  const selKey = monthKey(sel);
  const windowStart = new Date(sel.getFullYear(), sel.getMonth() - 11, 1);
  const windowEnd = new Date(sel.getFullYear(), sel.getMonth() + 1, 1); // exclusive
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) months.push(monthKey(new Date(sel.getFullYear(), sel.getMonth() - i, 1)));

  const [clients, websites, invoices, expenses, tickets, recentPayments] = await Promise.all([
    prisma.client.findMany({ where: { deletedAt: null } }),
    prisma.website.findMany({ where: { deletedAt: null }, include: { client: { select: { businessName: true, code: true } } } }),
    prisma.invoice.findMany({
      where: { deletedAt: null },
      include: { payments: { where: { deletedAt: null } }, client: { select: { businessName: true, code: true } } },
    }),
    prisma.expense.findMany({ where: { deletedAt: null } }),
    prisma.supportTicket.findMany({ where: { deletedAt: null }, include: { client: { select: { businessName: true, code: true } } } }),
    prisma.payment.findMany({
      where: { deletedAt: null },
      include: { client: { select: { businessName: true, code: true } }, invoice: { select: { code: true } } },
      orderBy: { paymentDate: "desc" },
      take: 8,
    }),
  ]);

  // Pre-compute invoice calcs once.
  const invCalc = invoices.map((inv) => ({
    inv,
    calc: invoiceCalc(
      {
        amount: toNum(inv.amount),
        discount: toNum(inv.discount),
        chargeType: inv.chargeType,
        dueDate: inv.dueDate,
        payments: inv.payments.map((p) => ({ amount: toNum(p.amount), paymentDate: p.paymentDate })),
      },
      now,
    ),
  }));

  // ---- 12-month chart series -------------------------------------------
  const billedByMonth: Record<string, number> = {};
  const paidByMonth: Record<string, number> = {};
  for (const { inv, calc } of invCalc) {
    if (inv.chargeType !== "Monthly Subscription") continue;
    const k = monthKey(inv.billingMonth);
    if (!months.includes(k)) continue;
    billedByMonth[k] = (billedByMonth[k] ?? 0) + calc.amountDue;
    paidByMonth[k] = (paidByMonth[k] ?? 0) + calc.amountPaid;
  }

  const allPayments = await prisma.payment.findMany({
    where: { deletedAt: null, paymentDate: { gte: windowStart, lt: windowEnd } },
    select: { amount: true, paymentDate: true },
  });
  const cashByMonth: Record<string, number> = {};
  for (const p of allPayments) cashByMonth[monthKey(p.paymentDate)] = (cashByMonth[monthKey(p.paymentDate)] ?? 0) + toNum(p.amount);

  const expenseByMonth: Record<string, number> = {};
  for (const e of expenses) {
    const k = monthKey(e.expenseDate);
    if (!months.includes(k)) continue;
    expenseByMonth[k] = (expenseByMonth[k] ?? 0) + toNum(e.amount);
  }

  const series = months.map((k) => ({
    month: k,
    subscriptionBilled: money(billedByMonth[k] ?? 0),
    subscriptionPaid: money(paidByMonth[k] ?? 0),
    cashReceived: money(cashByMonth[k] ?? 0),
    expenses: money(expenseByMonth[k] ?? 0),
    netCashFlow: money((cashByMonth[k] ?? 0) - (expenseByMonth[k] ?? 0)),
  }));

  // ---- Selected-month cards --------------------------------------------
  const activeClients = clients.filter((c) => c.status === "Active");
  const activeClientIds = new Set(activeClients.map((c) => c.id));
  // MRR = sum of each active website's own subscription (per-website billing)
  const mrr = money(websites.filter((w) => w.subscriptionActive && activeClientIds.has(w.clientId)).reduce((s, w) => s + toNum(w.monthlyFee), 0));

  const selSubs = invCalc.filter(({ inv }) => inv.chargeType === "Monthly Subscription" && monthKey(inv.billingMonth) === selKey);
  const subBilled = money(selSubs.reduce((s, x) => s + x.calc.amountDue, 0));
  const subPaid = money(selSubs.reduce((s, x) => s + x.calc.amountPaid, 0));
  const subOutstanding = money(subBilled - subPaid);
  const collectionRate = subBilled > 0 ? Math.round((subPaid / subBilled) * 1000) / 10 : null;

  const cashReceived = money(cashByMonth[selKey] ?? 0);
  const expensesTotal = money(expenseByMonth[selKey] ?? 0);

  const totalOverdue = money(
    invCalc
      .filter(({ calc }) => calc.status === "Overdue" || calc.status === "Partial – Overdue")
      .reduce((s, x) => s + x.calc.balance, 0),
  );

  const openTickets = tickets.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");

  // Renewal items due within 60 days (domain, hosting, ssl each counted).
  let renewalsDue = 0;
  for (const w of websites) {
    for (const d of [w.domainRenewalDate, w.hostingRenewalDate, w.sslExpiryDate]) {
      const rem = daysUntil(d, now);
      if (rem != null && rem <= 60) renewalsDue++;
    }
  }

  const undepositedPayments = await prisma.payment.count({
    where: { deletedAt: null, depositStatus: "Not Deposited" },
  });

  // ---- Breakdowns -------------------------------------------------------
  const countBy = <T>(arr: T[], key: (x: T) => string) => {
    const m: Record<string, number> = {};
    for (const x of arr) m[key(x)] = (m[key(x)] ?? 0) + 1;
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  };

  const paymentStatusBreakdown = countBy(invCalc, (x) => x.calc.status);
  const ticketStatusBreakdown = countBy(tickets, (t) => t.status);
  const clientsByPlan = countBy(activeClients, (c) => c.servicePlan || "Unassigned");
  const websitesByStatus = countBy(websites, (w) => w.status);

  // ---- Alert lists ------------------------------------------------------
  const clientName = (c: { businessName: string; code: string }) => ({ clientName: c.businessName, clientCode: c.code });

  const overdueInvoices = invCalc
    .filter(({ calc }) => calc.status === "Overdue" || calc.status === "Partial – Overdue")
    .sort((a, b) => b.calc.daysLate - a.calc.daysLate)
    .slice(0, 8)
    .map(({ inv, calc }) => ({
      id: inv.id,
      code: inv.code,
      clientId: inv.clientId,
      ...clientName(inv.client),
      balance: calc.balance,
      daysLate: calc.daysLate,
      dueDate: inv.dueDate,
      status: calc.status,
    }));

  const unpaidSubscriptions = selSubs
    .filter((x) => x.calc.balance > 0)
    .slice(0, 8)
    .map(({ inv, calc }) => ({
      id: inv.id,
      code: inv.code,
      clientId: inv.clientId,
      ...clientName(inv.client),
      balance: calc.balance,
      status: calc.status,
      dueDate: inv.dueDate,
    }));

  const renewalList = (pick: (w: (typeof websites)[number]) => Date | null) =>
    websites
      .map((w) => ({ w, r: renewalStatus(pick(w), now) }))
      .filter(({ r }) => r.daysRemaining != null && r.daysRemaining <= 60)
      .sort((a, b) => (a.r.daysRemaining ?? 0) - (b.r.daysRemaining ?? 0))
      .slice(0, 8)
      .map(({ w, r }) => ({
        id: w.id,
        code: w.code,
        clientId: w.clientId,
        clientName: w.client.businessName,
        projectName: w.projectName,
        daysRemaining: r.daysRemaining,
        status: r.status,
      }));

  const domainsExpiring = renewalList((w) => w.domainRenewalDate);
  const hostingExpiring = renewalList((w) => w.hostingRenewalDate);
  const sslExpiring = renewalList((w) => w.sslExpiryDate);

  const recurringExpensesSoon = expenses
    .filter((e) => e.recurring && e.nextRenewalDate)
    .map((e) => ({ e, rem: daysUntil(e.nextRenewalDate, now) }))
    .filter(({ rem }) => rem != null && rem <= 60)
    .sort((a, b) => (a.rem ?? 0) - (b.rem ?? 0))
    .slice(0, 8)
    .map(({ e, rem }) => ({ id: e.id, code: e.code, vendor: e.vendor, amount: toNum(e.amount), daysRemaining: rem, nextRenewalDate: e.nextRenewalDate }));

  const urgentTickets = openTickets
    .filter((t) => t.priority === "Urgent")
    .map((t) => ({
      id: t.id,
      code: t.code,
      clientId: t.clientId,
      clientName: t.client?.businessName ?? t.requesterBusiness ?? "Website request",
      summary: t.summary,
      status: t.status,
      dueDate: t.dueDate,
      deadlineStatus: deadlineStatus({ status: t.status, requestedDate: t.requestedDate, dueDate: t.dueDate, completedDate: t.completedDate }, now).deadlineStatus,
    }))
    .slice(0, 8);

  const recent = recentPayments.map((p) => ({
    id: p.id,
    code: p.code,
    clientId: p.clientId,
    clientName: p.client.businessName,
    amount: toNum(p.amount),
    method: p.method,
    paymentDate: p.paymentDate,
    invoiceCode: p.invoice?.code ?? null,
    depositStatus: p.depositStatus,
  }));

  res.json({
    month: selKey,
    cards: {
      activeClients: activeClients.length,
      monthlyRecurringRevenue: mrr,
      subscriptionBilled: subBilled,
      subscriptionPaid: subPaid,
      subscriptionOutstanding: subOutstanding,
      collectionRate,
      cashReceived,
      expenses: expensesTotal,
      netCashFlow: money(cashReceived - expensesTotal),
      totalOverdue,
      openTickets: openTickets.length,
      renewalsDue60: renewalsDue,
      undepositedPayments,
    },
    series,
    breakdowns: { paymentStatusBreakdown, ticketStatusBreakdown, clientsByPlan, websitesByStatus },
    lists: {
      overdueInvoices,
      unpaidSubscriptions,
      domainsExpiring,
      hostingExpiring,
      sslExpiring,
      recurringExpensesSoon,
      urgentTickets,
      recentPayments: recent,
    },
  });
});

export default router;
