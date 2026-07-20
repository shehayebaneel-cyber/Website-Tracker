import { Router } from "express";
import { prisma } from "../lib/db.js";
import {
  serializeClient, serializeWebsite, serializeInvoice, serializePayment, serializeExpense, serializeTicket,
} from "../lib/serialize.js";

const router = Router();

function csvCell(v: unknown): string {
  if (v == null) return "";
  let s: string;
  if (v instanceof Date) s = v.toISOString().slice(0, 10);
  else if (typeof v === "object") s = JSON.stringify(v);
  else s = String(v);
  if (/[",\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const head = columns.join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(r[c])).join(",")).join("\n");
  return `${head}\n${body}\n`;
}

function send(res: any, name: string, csv: string) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  res.send(csv);
}

router.get("/clients.csv", async (_req, res) => {
  const rows = await prisma.client.findMany({
    where: { deletedAt: null },
    include: { invoices: { where: { deletedAt: null }, include: { payments: { where: { deletedAt: null } } } }, payments: { where: { deletedAt: null } }, websites: { where: { deletedAt: null } }, tickets: { where: { deletedAt: null } } },
    orderBy: { code: "asc" },
  });
  const data = rows.map((c) => serializeClient(c, { invoices: c.invoices as any, payments: c.payments, websites: c.websites, tickets: c.tickets }));
  send(res, "clients.csv", toCsv(data as any, ["code", "businessName", "contactName", "phone", "city", "servicePlan", "status", "monthlyFee", "billingDay", "outstanding", "totalPaid", "lifetimeBilled", "websiteCount"]));
});

router.get("/websites.csv", async (_req, res) => {
  const rows = await prisma.website.findMany({ where: { deletedAt: null }, include: { client: { select: { businessName: true } } }, orderBy: { code: "asc" } });
  const data = rows.map((w) => ({ ...serializeWebsite(w), clientName: w.client.businessName }));
  send(res, "websites.csv", toCsv(data as any, ["code", "clientName", "projectName", "status", "primaryUrl", "domainName", "domainStatus", "domainDaysRemaining", "hostingStatus", "hostingDaysRemaining", "sslStatus", "sslDaysRemaining"]));
});

router.get("/invoices.csv", async (_req, res) => {
  const rows = await prisma.invoice.findMany({ where: { deletedAt: null }, include: { payments: { where: { deletedAt: null } }, client: { select: { businessName: true } } }, orderBy: { invoiceDate: "desc" } });
  const data = rows.map((i) => ({ ...serializeInvoice(i), clientName: i.client.businessName }));
  send(res, "invoices.csv", toCsv(data as any, ["code", "clientName", "billingMonth", "chargeType", "invoiceDate", "dueDate", "amount", "discount", "amountDue", "amountPaid", "balance", "status", "daysLate"]));
});

router.get("/payments.csv", async (_req, res) => {
  const rows = await prisma.payment.findMany({ where: { deletedAt: null }, include: { invoice: true, client: { select: { businessName: true } } }, orderBy: { paymentDate: "desc" } });
  const data = rows.map((p) => ({ ...serializePayment(p), clientName: p.client.businessName }));
  send(res, "payments.csv", toCsv(data as any, ["code", "paymentDate", "clientName", "invoiceCode", "amount", "method", "reference", "receivedBy", "depositStatus"]));
});

router.get("/expenses.csv", async (_req, res) => {
  const rows = await prisma.expense.findMany({ where: { deletedAt: null }, orderBy: { expenseDate: "desc" } });
  const data = rows.map((e) => serializeExpense(e));
  send(res, "expenses.csv", toCsv(data as any, ["code", "expenseDate", "category", "vendor", "description", "amount", "method", "recurring", "renewalFrequency", "nextRenewalDate", "reimbursementStatus"]));
});

router.get("/support.csv", async (_req, res) => {
  const rows = await prisma.supportTicket.findMany({ where: { deletedAt: null }, include: { invoice: true, client: { select: { businessName: true } } }, orderBy: { requestedDate: "desc" } });
  const data = rows.map((t) => ({ ...serializeTicket(t), clientName: t.client?.businessName ?? t.requesterBusiness ?? "—" }));
  send(res, "support.csv", toCsv(data as any, ["code", "requestedDate", "clientName", "category", "summary", "priority", "status", "deadlineStatus", "hoursSpent", "includedInSubscription", "extraCharge", "clientApproved", "invoiceCode"]));
});

export default router;
