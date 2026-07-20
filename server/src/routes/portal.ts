import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { toNum, money, firstOfMonth, monthKey, startOfDay } from "../lib/calc.js";
import { serializeInvoice, serializePayment } from "../lib/serialize.js";
import { friendlyStatus, nextSupportCode } from "../lib/sales.js";

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

// ---- Support: submit / view / reply / confirm -----------------------------
const PRIORITY_MAP: Record<string, string> = { Normal: "Low", Important: "High", Urgent: "Urgent" };
function internalCategory(requestType: string): string {
  const t = requestType.toLowerCase();
  if (t.includes("design")) return "Design Change";
  if (t.includes("bug") || t.includes("not opening") || t.includes("problem") || t.includes("error")) return "Bug Fix";
  if (t.includes("feature") || t.includes("new page")) return "New Feature";
  if (t.includes("update") || t.includes("price") || t.includes("text") || t.includes("photo") || t.includes("content")) return "Content Change";
  return "Other";
}
const fileSchema = z.array(z.object({ name: z.string(), url: z.string(), size: z.number(), type: z.string() })).optional().nullable();

function fullTicketDto(t: any) {
  return {
    ...ticketDto(t),
    websiteId: t.websiteId,
    businessImpact: t.businessImpact,
    pageUrl: t.pageUrl,
    notes: t.notes,
    files: t.files ?? [],
    clientConfirmed: t.clientConfirmed,
    messages: (t.messages ?? []).map((m: any) => ({ id: m.id, sender: m.sender, authorName: m.authorName, body: m.body, attachments: m.attachments ?? [], createdAt: m.createdAt })),
  };
}

const supportSchema = z.object({
  requestType: z.string().min(1),
  summary: z.string().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  websiteId: z.string().optional().nullable(),
  priority: z.enum(["Normal", "Important", "Urgent"]).default("Normal"),
  businessImpact: z.string().optional().nullable(),
  pageUrl: z.string().optional().nullable(),
  files: fileSchema,
});

router.post("/support", async (req, res) => {
  const parsed = supportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Please check the form." });
  const b = parsed.data;
  const client = res.locals.client;
  const now = new Date();

  // Resolve a website of this client (the chosen one, or their only one).
  let websiteId: string | null = null;
  const websites = await prisma.website.findMany({ where: { clientId: client.id, deletedAt: null }, select: { id: true } });
  if (b.websiteId && websites.some((w) => w.id === b.websiteId)) websiteId = b.websiteId;
  else if (websites.length === 1) websiteId = websites[0].id;

  const created = await prisma.$transaction(async (tx) => {
    const code = await nextSupportCode(tx, now);
    const ticket = await tx.supportTicket.create({
      data: {
        code, requestedDate: now, requestSource: "Client Portal",
        clientId: client.id, websiteId,
        category: internalCategory(b.requestType), summary: b.summary, priority: PRIORITY_MAP[b.priority] ?? "Low",
        status: "Not Started", requestType: b.requestType,
        requesterName: client.contactName, requesterBusiness: client.businessName,
        pageUrl: b.pageUrl ?? null, businessImpact: b.businessImpact ?? null, files: (b.files ?? undefined) as any,
        notes: b.description ?? null,
      },
    });
    if (b.description) {
      await tx.ticketMessage.create({ data: { ticketId: ticket.id, sender: "client", authorName: client.contactName ?? client.businessName, body: b.description, attachments: (b.files ?? undefined) as any } });
    }
    return ticket;
  });
  res.status(201).json({ reference: created.code, id: created.id });
});

async function loadOwnedTicket(req: Request, res: Response) {
  const client = res.locals.client;
  const t = await prisma.supportTicket.findFirst({
    where: { id: req.params.id, clientId: client.id, deletedAt: null },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return t;
}

router.get("/support/:id", async (req, res) => {
  const t = await loadOwnedTicket(req, res);
  if (!t) return res.status(404).json({ error: "Request not found" });
  res.json({ ticket: fullTicketDto(t) });
});

router.post("/support/:id/reply", async (req, res) => {
  const schema = z.object({ body: z.string().min(1).max(4000), files: fileSchema });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Write a message first." });
  const t = await loadOwnedTicket(req, res);
  if (!t) return res.status(404).json({ error: "Request not found" });
  const client = res.locals.client;
  await prisma.ticketMessage.create({ data: { ticketId: t.id, sender: "client", authorName: client.contactName ?? client.businessName, body: parsed.data.body, attachments: (parsed.data.files ?? undefined) as any } });
  // A client reply re-opens a waiting ticket.
  if (t.status === "Waiting for Client") await prisma.supportTicket.update({ where: { id: t.id }, data: { status: "In Progress" } });
  const fresh = await loadOwnedTicket(req, res);
  res.status(201).json({ ticket: fullTicketDto(fresh) });
});

router.post("/support/:id/confirm", async (req, res) => {
  const t = await loadOwnedTicket(req, res);
  if (!t) return res.status(404).json({ error: "Request not found" });
  if (t.status !== "Completed") return res.status(400).json({ error: "This request isn't marked completed yet." });
  await prisma.supportTicket.update({ where: { id: t.id }, data: { clientConfirmed: true, clientConfirmedAt: new Date() } });
  const fresh = await loadOwnedTicket(req, res);
  res.json({ ticket: fullTicketDto(fresh) });
});

export default router;
