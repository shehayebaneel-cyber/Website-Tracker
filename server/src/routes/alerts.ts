import { Router } from "express";
import { prisma } from "../lib/db.js";
import { invoiceCalc, renewalStatus, deadlineStatus, daysUntil, toNum, money } from "../lib/calc.js";

const router = Router();

interface Alert {
  type: string;
  severity: "info" | "warn" | "attention" | "critical";
  message: string;
  entity: "client" | "website" | "invoice" | "expense" | "ticket" | "payment";
  entityId: string;
  linkId: string; // id to navigate to (usually client or website)
  days: number | null;
  // reminder context (present on invoice alerts)
  reminder?: {
    clientId: string;
    clientName: string;
    contactName: string | null;
    phone: string | null;
    invoiceCode: string;
    balance: number;
    daysLate: number;
    dueDate: Date;
    reminderStatus: string;
  };
}

// The in-app reminders feed. Every alert the spec (§12) asks the system to
// surface, derived live so it always reflects current data.
router.get("/", async (_req, res) => {
  const now = new Date();
  const [invoices, websites, expenses, tickets, undeposited] = await Promise.all([
    prisma.invoice.findMany({ where: { deletedAt: null }, include: { payments: { where: { deletedAt: null } }, client: { select: { businessName: true, contactName: true, phone: true } } } }),
    prisma.website.findMany({ where: { deletedAt: null }, include: { client: { select: { businessName: true } } } }),
    prisma.expense.findMany({ where: { deletedAt: null, recurring: true } }),
    prisma.supportTicket.findMany({ where: { deletedAt: null }, include: { client: { select: { businessName: true } } } }),
    prisma.payment.findMany({ where: { deletedAt: null, depositStatus: "Not Deposited" }, include: { client: { select: { businessName: true } } } }),
  ]);

  const alerts: Alert[] = [];

  for (const inv of invoices) {
    const calc = invoiceCalc({
      amount: toNum(inv.amount), discount: toNum(inv.discount), chargeType: inv.chargeType,
      dueDate: inv.dueDate, payments: inv.payments.map((p) => ({ amount: toNum(p.amount), paymentDate: p.paymentDate })),
    }, now);
    const days = daysUntil(inv.dueDate, now);
    const reminder = {
      clientId: inv.clientId, clientName: inv.client.businessName, contactName: inv.client.contactName,
      phone: inv.client.phone, invoiceCode: inv.code, balance: calc.balance, daysLate: calc.daysLate,
      dueDate: inv.dueDate, reminderStatus: inv.reminderStatus,
    };
    if (calc.status === "Overdue" || calc.status === "Partial – Overdue") {
      alerts.push({ type: "invoiceOverdue", severity: "critical", entity: "invoice", entityId: inv.id, linkId: inv.clientId, days: calc.daysLate,
        message: `${inv.client.businessName} — ${inv.code} overdue ${calc.daysLate}d, ${money(calc.balance)} due`, reminder });
    } else if (calc.status === "Due" && days != null && days <= 7) {
      alerts.push({ type: "invoiceDueSoon", severity: "warn", entity: "invoice", entityId: inv.id, linkId: inv.clientId, days,
        message: `${inv.client.businessName} — ${inv.code} due in ${days}d (${money(calc.balance)})`, reminder });
    }
  }

  const renew = (w: any, kind: string, date: Date | null) => {
    const r = renewalStatus(date, now);
    if (r.status === "Expired") alerts.push({ type: `${kind}Expired`, severity: "critical", entity: "website", entityId: w.id, linkId: w.id, days: r.daysRemaining, message: `${w.client.businessName} — ${kind} expired ${Math.abs(r.daysRemaining ?? 0)}d ago (${w.code})` });
    else if (r.status === "Due in 30 Days") alerts.push({ type: `${kind}Renewal`, severity: "attention", entity: "website", entityId: w.id, linkId: w.id, days: r.daysRemaining, message: `${w.client.businessName} — ${kind} renews in ${r.daysRemaining}d (${w.code})` });
    else if (r.status === "Due in 60 Days") alerts.push({ type: `${kind}Renewal`, severity: "warn", entity: "website", entityId: w.id, linkId: w.id, days: r.daysRemaining, message: `${w.client.businessName} — ${kind} renews in ${r.daysRemaining}d (${w.code})` });
  };
  for (const w of websites) {
    renew(w, "Domain", w.domainRenewalDate);
    renew(w, "Hosting", w.hostingRenewalDate);
    renew(w, "SSL", w.sslExpiryDate);
    // missing backup / stale update
    const backupDays = daysUntil(w.lastBackupDate, now);
    if (w.status === "Live" && (w.lastBackupDate == null || (backupDays != null && backupDays < -60)))
      alerts.push({ type: "missingBackup", severity: "warn", entity: "website", entityId: w.id, linkId: w.id, days: backupDays, message: `${w.client.businessName} — no recent backup (${w.code})` });
  }

  for (const e of expenses) {
    const days = daysUntil(e.nextRenewalDate, now);
    if (days != null && days <= 30) alerts.push({ type: "expenseRenewal", severity: days < 0 ? "attention" : "warn", entity: "expense", entityId: e.id, linkId: e.id, days, message: `${e.vendor ?? e.code} — recurring ${money(toNum(e.amount))} ${days < 0 ? "was due" : "due in " + days + "d"}` });
  }

  for (const t of tickets) {
    const open = t.status !== "Completed" && t.status !== "Cancelled";
    if (!open) {
      // approved extra work never invoiced
      if (!t.includedInSubscription && t.clientApproved && toNum(t.extraCharge) > 0 && !t.invoiceId)
        alerts.push({ type: "unbilledExtraWork", severity: "attention", entity: "ticket", entityId: t.id, linkId: t.clientId ?? "", days: null, message: `${t.client?.businessName ?? t.requesterBusiness ?? "Website request"} — approved extra work not invoiced (${t.code}, ${money(toNum(t.extraCharge))})` });
      continue;
    }
    const d = deadlineStatus({ status: t.status, requestedDate: t.requestedDate, dueDate: t.dueDate, completedDate: t.completedDate }, now);
    if (t.priority === "Urgent") alerts.push({ type: "urgentTicket", severity: "critical", entity: "ticket", entityId: t.id, linkId: t.clientId ?? "", days: daysUntil(t.dueDate, now), message: `${t.client?.businessName ?? t.requesterBusiness ?? "Website request"} — urgent: ${t.summary} (${t.code})` });
    else if (d.deadlineStatus === "Overdue") alerts.push({ type: "overdueTicket", severity: "attention", entity: "ticket", entityId: t.id, linkId: t.clientId ?? "", days: daysUntil(t.dueDate, now), message: `${t.client?.businessName ?? t.requesterBusiness ?? "Website request"} — ticket overdue: ${t.summary} (${t.code})` });
    if (!t.includedInSubscription && t.clientApproved && toNum(t.extraCharge) > 0 && !t.invoiceId)
      alerts.push({ type: "unbilledExtraWork", severity: "attention", entity: "ticket", entityId: t.id, linkId: t.clientId ?? "", days: null, message: `${t.client?.businessName ?? t.requesterBusiness ?? "Website request"} — approved extra work not invoiced (${t.code}, ${money(toNum(t.extraCharge))})` });
  }

  for (const p of undeposited) {
    alerts.push({ type: "notDeposited", severity: "info", entity: "payment", entityId: p.id, linkId: p.clientId, days: null, message: `${p.client.businessName} — ${money(toNum(p.amount))} received, not deposited (${p.code})` });
  }

  const rank: Record<string, number> = { critical: 0, attention: 1, warn: 2, info: 3 };
  alerts.sort((a, b) => rank[a.severity] - rank[b.severity] || (a.days ?? 999) - (b.days ?? 999));

  const counts = { critical: 0, attention: 0, warn: 0, info: 0 };
  for (const a of alerts) counts[a.severity]++;

  res.json({ alerts, counts, total: alerts.length });
});

export default router;
