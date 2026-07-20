import { Router } from "express";
import { prisma } from "../lib/db.js";
import { invoiceCalc, renewalStatus, toNum, money, monthKey, daysUntil } from "../lib/calc.js";

const router = Router();

function range(req: any) {
  const to = req.query.to ? new Date(req.query.to as string) : new Date();
  const from = req.query.from ? new Date(req.query.from as string) : new Date(to.getFullYear(), to.getMonth() - 11, 1);
  return { from, to };
}
const inRange = (d: Date | null | undefined, from: Date, to: Date) => !!d && d >= from && d <= to;

// Full report bundle. Filters: from, to, clientId, plan.
router.get("/", async (req, res) => {
  const now = new Date();
  const { from, to } = range(req);
  const clientId = req.query.clientId as string | undefined;
  const plan = req.query.plan as string | undefined;

  const clientWhere: any = { deletedAt: null };
  if (clientId) clientWhere.id = clientId;
  if (plan && plan !== "All") clientWhere.servicePlan = plan;

  const [clients, invoices, payments, expenses, tickets, websites] = await Promise.all([
    prisma.client.findMany({ where: clientWhere }),
    prisma.invoice.findMany({ where: { deletedAt: null, ...(clientId ? { clientId } : {}) }, include: { payments: { where: { deletedAt: null } }, client: { select: { businessName: true, code: true, servicePlan: true } } } }),
    prisma.payment.findMany({ where: { deletedAt: null, ...(clientId ? { clientId } : {}) }, include: { client: { select: { businessName: true, code: true } } } }),
    prisma.expense.findMany({ where: { deletedAt: null, ...(clientId ? { clientId } : {}) } }),
    prisma.supportTicket.findMany({ where: { deletedAt: null, ...(clientId ? { clientId } : {}) }, include: { client: { select: { businessName: true, code: true } } } }),
    prisma.website.findMany({ where: { deletedAt: null, ...(clientId ? { clientId } : {}) }, include: { client: { select: { businessName: true } } } }),
  ]);
  const clientIds = new Set(clients.map((c) => c.id));

  const invCalc = invoices
    .filter((i) => clientIds.has(i.clientId))
    .map((i) => ({ i, c: invoiceCalc({ amount: toNum(i.amount), discount: toNum(i.discount), chargeType: i.chargeType, dueDate: i.dueDate, payments: i.payments.map((p) => ({ amount: toNum(p.amount), paymentDate: p.paymentDate })) }, now) }));

  // ---- summary ----
  const activeClients = clients.filter((c) => c.status === "Active");
  const activeClientIds = new Set(activeClients.map((c) => c.id));
  // MRR = sum of each active website's own subscription (per-website billing)
  const mrr = money(websites.filter((w) => w.subscriptionActive && activeClientIds.has(w.clientId)).reduce((s, w) => s + toNum(w.monthlyFee), 0));
  const billedInRange = invCalc.filter(({ i }) => inRange(i.invoiceDate, from, to));
  const totalBilled = money(billedInRange.reduce((s, x) => s + x.c.amountDue, 0));
  const paymentsInRange = payments.filter((p) => clientIds.has(p.clientId) && inRange(p.paymentDate, from, to));
  const totalCollected = money(paymentsInRange.reduce((s, p) => s + toNum(p.amount), 0));
  const outstanding = money(invCalc.reduce((s, x) => s + Math.max(x.c.balance, 0), 0));
  const overdueAmount = money(invCalc.filter((x) => x.c.status === "Overdue" || x.c.status === "Partial – Overdue").reduce((s, x) => s + x.c.balance, 0));
  const expInRange = expenses.filter((e) => inRange(e.expenseDate, from, to));
  const totalExpenses = money(expInRange.reduce((s, e) => s + toNum(e.amount), 0));
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 1000) / 10 : null;

  // ---- revenue by client ----
  const revenueByClient = clients.map((c) => {
    const paid = money(payments.filter((p) => p.clientId === c.id && inRange(p.paymentDate, from, to)).reduce((s, p) => s + toNum(p.amount), 0));
    const billed = money(invCalc.filter((x) => x.i.clientId === c.id && inRange(x.i.invoiceDate, from, to)).reduce((s, x) => s + x.c.amountDue, 0));
    const bal = money(invCalc.filter((x) => x.i.clientId === c.id).reduce((s, x) => s + Math.max(x.c.balance, 0), 0));
    return { clientId: c.id, code: c.code, businessName: c.businessName, billed, paid, balance: bal };
  }).filter((r) => r.billed || r.paid || r.balance).sort((a, b) => b.paid - a.paid);

  // ---- revenue by plan ----
  const planMap = new Map<string, { count: number; mrr: number }>();
  for (const c of activeClients) {
    const key = c.servicePlan || "Unassigned";
    const e = planMap.get(key) ?? { count: 0, mrr: 0 };
    e.count++; e.mrr += toNum(c.monthlyFee);
    planMap.set(key, e);
  }
  const revenueByPlan = [...planMap].map(([name, v]) => ({ name, clients: v.count, mrr: money(v.mrr) }));

  // ---- expenses by category ----
  const catMap = new Map<string, number>();
  for (const e of expInRange) catMap.set(e.category, (catMap.get(e.category) ?? 0) + toNum(e.amount));
  const expensesByCategory = [...catMap].map(([name, total]) => ({ name, total: money(total) })).sort((a, b) => b.total - a.total);

  // ---- client profitability ----
  const clientProfitability = clients.map((c) => {
    const revenue = money(payments.filter((p) => p.clientId === c.id && inRange(p.paymentDate, from, to)).reduce((s, p) => s + toNum(p.amount), 0));
    const exp = money(expenses.filter((e) => e.clientId === c.id && inRange(e.expenseDate, from, to)).reduce((s, e) => s + toNum(e.amount), 0));
    return { clientId: c.id, code: c.code, businessName: c.businessName, revenue, expenses: exp, profit: money(revenue - exp) };
  }).filter((r) => r.revenue || r.expenses).sort((a, b) => b.profit - a.profit);

  // ---- support hours + extra work ----
  const hoursMap = new Map<string, { name: string; hours: number }>();
  for (const t of tickets) {
    if (!t.clientId || !t.client) continue; // hours-by-client only counts matched clients
    const e = hoursMap.get(t.clientId) ?? { name: t.client.businessName, hours: 0 };
    e.hours += toNum(t.hoursSpent);
    hoursMap.set(t.clientId, e);
  }
  const supportHoursByClient = [...hoursMap.values()].filter((x) => x.hours > 0).sort((a, b) => b.hours - a.hours);

  const paidExtraWork = money(tickets.filter((t) => !t.includedInSubscription && t.invoiceId).reduce((s, t) => s + toNum(t.extraCharge), 0));
  const unbilledExtra = tickets.filter((t) => !t.includedInSubscription && t.clientApproved && toNum(t.extraCharge) > 0 && !t.invoiceId);
  const unbilledExtraWork = { total: money(unbilledExtra.reduce((s, t) => s + toNum(t.extraCharge), 0)), items: unbilledExtra.map((t) => ({ code: t.code, clientName: t.client?.businessName ?? t.requesterBusiness ?? "—", amount: toNum(t.extraCharge), clientId: t.clientId })) };

  // ---- upcoming renewals ----
  const upcomingRenewals: any[] = [];
  for (const w of websites) {
    for (const [kind, d] of [["Domain", w.domainRenewalDate], ["Hosting", w.hostingRenewalDate], ["SSL", w.sslExpiryDate]] as const) {
      const r = renewalStatus(d, now);
      if (r.daysRemaining != null && r.daysRemaining <= 60) upcomingRenewals.push({ websiteId: w.id, code: w.code, clientName: w.client.businessName, kind, daysRemaining: r.daysRemaining, status: r.status });
    }
  }
  upcomingRenewals.sort((a, b) => a.daysRemaining - b.daysRemaining);

  // ---- cancelled clients + growth ----
  const cancelledClients = clients.filter((c) => c.status === "Cancelled").map((c) => ({ clientId: c.id, code: c.code, businessName: c.businessName, cancellationDate: c.cancellationDate }));

  const growthMonths: string[] = [];
  for (let i = 11; i >= 0; i--) growthMonths.push(monthKey(new Date(to.getFullYear(), to.getMonth() - i, 1)));
  const clientGrowth = growthMonths.map((k) => {
    const [y, m] = k.split("-").map(Number);
    const monthEnd = new Date(y, m, 0);
    const active = clients.filter((c) => c.subscriptionStartDate && new Date(c.subscriptionStartDate) <= monthEnd && (!c.cancellationDate || new Date(c.cancellationDate) > monthEnd)).length;
    return { month: k, active };
  });

  res.json({
    range: { from, to },
    summary: { mrr, totalBilled, totalCollected, outstanding, collectionRate, overdueAmount, totalExpenses, netCashFlow: money(totalCollected - totalExpenses), activeClients: activeClients.length },
    revenueByClient, revenueByPlan, expensesByCategory, clientProfitability,
    supportHoursByClient, paidExtraWork, unbilledExtraWork, upcomingRenewals, cancelledClients, clientGrowth,
    renewalsDueCount: upcomingRenewals.length,
  });
});

// Convenience: current outstanding by day-late buckets (aging)
router.get("/aging", async (req, res) => {
  const now = new Date();
  const clientId = req.query.clientId as string | undefined;
  const invoices = await prisma.invoice.findMany({ where: { deletedAt: null, ...(clientId ? { clientId } : {}) }, include: { payments: { where: { deletedAt: null } }, client: { select: { businessName: true } } } });
  const buckets = { current: 0, d1_30: 0, d31_60: 0, d60plus: 0 };
  for (const i of invoices) {
    const c = invoiceCalc({ amount: toNum(i.amount), discount: toNum(i.discount), chargeType: i.chargeType, dueDate: i.dueDate, payments: i.payments.map((p) => ({ amount: toNum(p.amount), paymentDate: p.paymentDate })) }, now);
    if (c.balance <= 0) continue;
    const late = -(daysUntil(i.dueDate, now) ?? 0);
    if (late <= 0) buckets.current += c.balance;
    else if (late <= 30) buckets.d1_30 += c.balance;
    else if (late <= 60) buckets.d31_60 += c.balance;
    else buckets.d60plus += c.balance;
  }
  res.json({ current: money(buckets.current), d1_30: money(buckets.d1_30), d31_60: money(buckets.d31_60), d60plus: money(buckets.d60plus) });
});

export default router;
