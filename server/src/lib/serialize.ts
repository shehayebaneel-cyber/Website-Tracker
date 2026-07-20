// ---------------------------------------------------------------------------
// Serializers: turn raw Prisma records into API DTOs, applying the calc layer
// and converting Decimal -> number at the boundary. The frontend never sees a
// stored balance — only computed truth.
// ---------------------------------------------------------------------------
import type { Client, Website, Invoice, Payment, Expense, SupportTicket } from "@prisma/client";
import {
  invoiceCalc,
  renewalStatus,
  deadlineStatus,
  toNum,
  money,
  daysUntil,
} from "./calc.js";

type InvoiceWithPayments = Invoice & { payments: Payment[] };

export function serializeInvoice(inv: InvoiceWithPayments, now = new Date()) {
  const calc = invoiceCalc(
    {
      amount: toNum(inv.amount),
      discount: toNum(inv.discount),
      chargeType: inv.chargeType,
      dueDate: inv.dueDate,
      payments: inv.payments.map((p) => ({ amount: toNum(p.amount), paymentDate: p.paymentDate })),
    },
    now,
  );
  return {
    id: inv.id,
    code: inv.code,
    clientId: inv.clientId,
    invoiceDate: inv.invoiceDate,
    billingMonth: inv.billingMonth,
    chargeType: inv.chargeType,
    description: inv.description,
    dueDate: inv.dueDate,
    amount: toNum(inv.amount),
    discount: toNum(inv.discount),
    reminderStatus: inv.reminderStatus,
    lastReminderDate: inv.lastReminderDate,
    notes: inv.notes,
    // derived
    amountDue: calc.amountDue,
    amountPaid: calc.amountPaid,
    balance: calc.balance,
    lastPaymentDate: calc.lastPaymentDate,
    status: calc.status,
    daysLate: calc.daysLate,
  };
}

export function serializePayment(p: Payment & { invoice?: Invoice | null }) {
  return {
    id: p.id,
    code: p.code,
    paymentDate: p.paymentDate,
    invoiceId: p.invoiceId,
    invoiceCode: p.invoice?.code ?? null,
    clientId: p.clientId,
    billingMonth: p.invoice?.billingMonth ?? null,
    amount: toNum(p.amount),
    method: p.method,
    reference: p.reference,
    receivedBy: p.receivedBy,
    depositStatus: p.depositStatus,
    depositDate: p.depositDate,
    notes: p.notes,
  };
}

export function serializeWebsite(w: Website, now = new Date()) {
  const domain = renewalStatus(w.domainRenewalDate, now);
  const hosting = renewalStatus(w.hostingRenewalDate, now);
  const ssl = renewalStatus(w.sslExpiryDate, now);
  return {
    id: w.id,
    code: w.code,
    clientId: w.clientId,
    projectName: w.projectName,
    primaryUrl: w.primaryUrl,
    status: w.status,
    projectStartDate: w.projectStartDate,
    launchDate: w.launchDate,
    notes: w.notes,
    // domain
    domainName: w.domainName,
    domainProvider: w.domainProvider,
    domainOwner: w.domainOwner,
    domainCost: w.domainCost != null ? toNum(w.domainCost) : null,
    domainPurchaseDate: w.domainPurchaseDate,
    domainRenewalDate: w.domainRenewalDate,
    domainAutoRenew: w.domainAutoRenew,
    domainDaysRemaining: domain.daysRemaining,
    domainStatus: domain.status,
    // hosting
    hostingProvider: w.hostingProvider,
    hostingOwner: w.hostingOwner,
    hostingPlan: w.hostingPlan,
    hostingCost: w.hostingCost != null ? toNum(w.hostingCost) : null,
    hostingRenewalDate: w.hostingRenewalDate,
    hostingAutoRenew: w.hostingAutoRenew,
    hostingDaysRemaining: hosting.daysRemaining,
    hostingStatus: hosting.status,
    // ssl
    sslExpiryDate: w.sslExpiryDate,
    sslDaysRemaining: ssl.daysRemaining,
    sslStatus: ssl.status,
    // tech
    repositoryUrl: w.repositoryUrl,
    deploymentPlatform: w.deploymentPlatform,
    adminUrl: w.adminUrl,
    analyticsInstalled: w.analyticsInstalled,
    searchConsoleInstalled: w.searchConsoleInstalled,
    lastBackupDate: w.lastBackupDate,
    lastWebsiteUpdate: w.lastWebsiteUpdate,
    credentialLocation: w.credentialLocation,
    techNotes: w.techNotes,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  };
}

export function serializeExpense(e: Expense) {
  const next = renewalStatus(e.nextRenewalDate);
  return {
    id: e.id,
    code: e.code,
    expenseDate: e.expenseDate,
    expenseMonth: e.expenseMonth,
    vendor: e.vendor,
    category: e.category,
    clientId: e.clientId,
    websiteId: e.websiteId,
    description: e.description,
    amount: toNum(e.amount),
    method: e.method,
    recurring: e.recurring,
    renewalFrequency: e.renewalFrequency,
    nextRenewalDate: e.nextRenewalDate,
    nextRenewalDays: next.daysRemaining,
    nextRenewalStatus: e.recurring ? next.status : "Not Tracked",
    reimbursable: e.reimbursable,
    reimbursementStatus: e.reimbursementStatus,
    receiptUrl: e.receiptUrl,
    notes: e.notes,
  };
}

export function serializeTicket(t: SupportTicket & { invoice?: Invoice | null }, now = new Date()) {
  const d = deadlineStatus(
    { status: t.status, requestedDate: t.requestedDate, dueDate: t.dueDate, completedDate: t.completedDate },
    now,
  );
  return {
    id: t.id,
    code: t.code,
    requestedDate: t.requestedDate,
    requestSource: t.requestSource,
    clientId: t.clientId,
    websiteId: t.websiteId,
    category: t.category,
    summary: t.summary,
    priority: t.priority,
    status: t.status,
    assignedTo: t.assignedTo,
    dueDate: t.dueDate,
    completedDate: t.completedDate,
    hoursSpent: toNum(t.hoursSpent),
    includedInSubscription: t.includedInSubscription,
    extraCharge: toNum(t.extraCharge),
    clientApproved: t.clientApproved,
    invoiceId: t.invoiceId,
    invoiceCode: t.invoice?.code ?? null,
    requestLink: t.requestLink,
    notes: t.notes,
    // derived
    daysOpen: d.daysOpen,
    deadlineStatus: d.deadlineStatus,
    // flag: approved extra work not yet invoiced
    unbilledExtraWork: !t.includedInSubscription && t.clientApproved && toNum(t.extraCharge) > 0 && !t.invoiceId,
    // public "Client Support" intake (from the website)
    requestType: t.requestType,
    requesterName: t.requesterName,
    requesterEmail: t.requesterEmail,
    requesterPhone: t.requesterPhone,
    requesterBusiness: t.requesterBusiness,
    requesterWebsite: t.requesterWebsite,
    pageUrl: t.pageUrl,
    deviceInfo: t.deviceInfo,
    browserInfo: t.browserInfo,
    problemStarted: t.problemStarted,
    frequency: t.frequency,
    stepsToReproduce: t.stepsToReproduce,
    businessImpact: t.businessImpact,
    files: (t.files as any) ?? [],
  };
}

// ---------------------------------------------------------------------------
// Client aggregate (all derived from the client's invoices/payments/websites).
// ---------------------------------------------------------------------------
export interface ClientRelations {
  invoices: InvoiceWithPayments[];
  payments: Payment[];
  websites: Website[];
  tickets: SupportTicket[];
}

export function serializeClient(c: Client, rel?: ClientRelations, now = new Date()) {
  const base = {
    id: c.id,
    code: c.code,
    businessName: c.businessName,
    contactName: c.contactName,
    phone: c.phone,
    website: c.website,
    city: c.city,
    subscriptionStartDate: c.subscriptionStartDate,
    billingDay: c.billingDay,
    monthlyFee: toNum(c.monthlyFee),
    servicePlan: c.servicePlan,
    status: c.status,
    pauseDate: c.pauseDate,
    cancellationDate: c.cancellationDate,
    paymentMethod: c.paymentMethod,
    notes: c.notes,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };

  if (!rel) return base;

  const invCalcs = rel.invoices.map((inv) => invoiceCalc(
    {
      amount: toNum(inv.amount),
      discount: toNum(inv.discount),
      chargeType: inv.chargeType,
      dueDate: inv.dueDate,
      payments: inv.payments.map((p) => ({ amount: toNum(p.amount), paymentDate: p.paymentDate })),
    },
    now,
  ));

  const lifetimeBilled = money(invCalcs.reduce((s, x) => s + x.amountDue, 0));
  const totalPaid = money(rel.payments.reduce((s, p) => s + toNum(p.amount), 0));
  const outstanding = money(invCalcs.reduce((s, x) => s + Math.max(x.balance, 0), 0));

  const paymentDates = rel.payments.map((p) => p.paymentDate);
  const lastPaymentDate = paymentDates.length
    ? paymentDates.reduce((a, b) => (b > a ? b : a))
    : null;

  // paid-through = latest billing month whose subscription invoice is fully paid
  const subs = rel.invoices
    .map((inv, i) => ({ inv, calc: invCalcs[i] }))
    .filter((x) => x.inv.chargeType === "Monthly Subscription")
    .sort((a, b) => a.inv.billingMonth.getTime() - b.inv.billingMonth.getTime());
  let paidThrough: Date | null = null;
  for (const s of subs) {
    if (s.calc.balance <= 0) paidThrough = s.inv.billingMonth;
    else break;
  }

  // next due = earliest unpaid invoice due date
  const unpaid = rel.invoices
    .map((inv, i) => ({ inv, calc: invCalcs[i] }))
    .filter((x) => x.calc.balance > 0)
    .sort((a, b) => a.inv.dueDate.getTime() - b.inv.dueDate.getTime());
  const nextDueDate = unpaid.length ? unpaid[0].inv.dueDate : null;

  const activeWebsites = rel.websites.filter((w) => w.status !== "Cancelled").length;
  const openTickets = rel.tickets.filter(
    (t) => t.status !== "Completed" && t.status !== "Cancelled",
  ).length;

  return {
    ...base,
    // derived
    lifetimeBilled,
    totalPaid,
    outstanding,
    lastPaymentDate,
    paidThrough,
    nextDueDate,
    nextDueInDays: nextDueDate ? daysUntil(nextDueDate, now) : null,
    websiteCount: rel.websites.length,
    activeWebsiteCount: activeWebsites,
    openTicketCount: openTickets,
  };
}
