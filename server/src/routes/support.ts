import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { paging } from "../lib/http.js";
import { nextTicketCode } from "../lib/ids.js";
import { serializeTicket } from "../lib/serialize.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const tInclude = {
  invoice: true,
  client: { select: { businessName: true, code: true } },
} satisfies Prisma.SupportTicketInclude;

function withClient(t: any) {
  const fromWebsite = t.requestSource === "Website Form";
  return {
    ...serializeTicket(t),
    clientName: t.client?.businessName ?? t.requesterBusiness ?? "—",
    clientCode: t.client?.code ?? null,
    fromWebsite,
    unlinked: fromWebsite && !t.clientId,
  };
}

// ---- List -----------------------------------------------------------------
router.get("/", async (req, res) => {
  const { page, pageSize, skip, take } = paging(req);
  const where: Prisma.SupportTicketWhereInput = { deletedAt: null };
  if (req.query.clientId) where.clientId = req.query.clientId as string;
  if (req.query.websiteId) where.websiteId = req.query.websiteId as string;
  if (req.query.status && req.query.status !== "All") where.status = req.query.status as string;
  if (req.query.priority && req.query.priority !== "All") where.priority = req.query.priority as string;
  const q = (req.query.q as string | undefined)?.trim();
  if (q) where.OR = [
    { code: { contains: q, mode: "insensitive" } },
    { summary: { contains: q, mode: "insensitive" } },
    { client: { businessName: { contains: q, mode: "insensitive" } } },
    { requesterBusiness: { contains: q, mode: "insensitive" } },
  ];

  const [total, rows] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({ where, include: tInclude, orderBy: { requestedDate: "desc" }, skip, take }),
  ]);
  res.json({ items: rows.map(withClient), total, page, pageSize, pageCount: Math.ceil(total / pageSize) });
});

const upsert = z.object({
  requestedDate: z.coerce.date().optional(),
  requestSource: z.string().optional().nullable(),
  clientId: z.string().min(1),
  websiteId: z.string().optional().nullable(),
  category: z.string().default("Other"),
  summary: z.string().min(1),
  priority: z.string().default("Medium"),
  status: z.string().default("Not Started"),
  assignedTo: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  completedDate: z.coerce.date().optional().nullable(),
  hoursSpent: z.coerce.number().min(0).optional(),
  includedInSubscription: z.coerce.boolean().optional(),
  extraCharge: z.coerce.number().min(0).optional(),
  clientApproved: z.coerce.boolean().optional(),
  invoiceId: z.string().optional().nullable(),
  requestLink: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Enforce the extra-work rule: billable work (not in subscription) needs a charge.
function validateBilling(b: any): string | null {
  if (b.includedInSubscription === false && b.extraCharge != null && b.extraCharge <= 0) {
    return "Work not included in the subscription needs an extra charge amount.";
  }
  return null;
}

router.post("/", async (req, res) => {
  const parsed = upsert.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data", details: parsed.error.flatten() });
  const b = parsed.data;
  const err = validateBilling(b);
  if (err) return res.status(400).json({ error: err });

  const client = await prisma.client.findFirst({ where: { id: b.clientId, deletedAt: null } });
  if (!client) return res.status(400).json({ error: "Client not found" });

  // completing a ticket must record when
  let completedDate = b.completedDate ?? null;
  if (b.status === "Completed" && !completedDate) completedDate = new Date();

  const created = await prisma.$transaction(async (tx) => {
    const requestedDate = b.requestedDate ?? new Date();
    const code = await nextTicketCode(tx, requestedDate);
    return tx.supportTicket.create({
      data: {
        code,
        requestedDate,
        requestSource: b.requestSource ?? null,
        clientId: client.id,
        websiteId: b.websiteId || null,
        category: b.category,
        summary: b.summary,
        priority: b.priority,
        status: b.status,
        assignedTo: b.assignedTo ?? null,
        dueDate: b.dueDate ?? null,
        completedDate,
        hoursSpent: b.hoursSpent ?? 0,
        includedInSubscription: b.includedInSubscription ?? true,
        extraCharge: b.extraCharge ?? 0,
        clientApproved: b.clientApproved ?? false,
        invoiceId: b.invoiceId || null,
        requestLink: b.requestLink ?? null,
        notes: b.notes ?? null,
      },
      include: tInclude,
    });
  });
  await logActivity(req, "SupportTicket", created.id, "create", `Created ticket ${created.code} (${client.businessName})`);
  res.status(201).json({ ticket: withClient(created) });
});

router.patch("/:id", async (req, res) => {
  const parsed = upsert.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data" });
  const existing = await prisma.supportTicket.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: "Ticket not found" });
  const b: any = parsed.data;
  const err = validateBilling({ includedInSubscription: b.includedInSubscription ?? existing.includedInSubscription, extraCharge: b.extraCharge ?? Number(existing.extraCharge) });
  if (err) return res.status(400).json({ error: err });

  const data: any = {};
  for (const [k, v] of Object.entries(b)) if (v !== undefined) data[k] = v === "" ? null : v;
  // auto-stamp completion; clear it if re-opened
  if (data.status === "Completed" && !existing.completedDate && !data.completedDate) data.completedDate = new Date();
  if (data.status && data.status !== "Completed") data.completedDate = null;

  const updated = await prisma.supportTicket.update({ where: { id: existing.id }, data, include: tInclude });
  await logActivity(req, "SupportTicket", updated.id, "update", `Updated ticket ${updated.code}`);
  res.json({ ticket: withClient(updated) });
});

// ---- Conversation thread (team <-> client) --------------------------------
function msgDto(m: any) {
  return { id: m.id, sender: m.sender, authorName: m.authorName, body: m.body, attachments: m.attachments ?? [], createdAt: m.createdAt };
}

router.get("/:id/thread", async (req, res) => {
  const t = await prisma.supportTicket.findFirst({ where: { id: req.params.id, deletedAt: null }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  if (!t) return res.status(404).json({ error: "Ticket not found" });
  res.json({ clientConfirmed: t.clientConfirmed, clientConfirmedAt: t.clientConfirmedAt, messages: t.messages.map(msgDto) });
});

router.post("/:id/reply", async (req, res) => {
  const body = String(req.body?.body ?? "").trim();
  if (!body) return res.status(400).json({ error: "Write a reply first." });
  const t = await prisma.supportTicket.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!t) return res.status(404).json({ error: "Ticket not found" });
  await prisma.ticketMessage.create({ data: { ticketId: t.id, sender: "team", authorName: req.user?.email ?? "IGNIS", body } });
  // Replying to the client puts the ball in their court.
  if (["Not Started", "In Progress"].includes(t.status)) await prisma.supportTicket.update({ where: { id: t.id }, data: { status: "Waiting for Client" } });
  await logActivity(req, "SupportTicket", t.id, "reply", `Replied to ${t.code}`);
  const fresh = await prisma.supportTicket.findFirst({ where: { id: t.id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  res.status(201).json({ messages: fresh!.messages.map(msgDto) });
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.supportTicket.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: "Ticket not found" });
  await prisma.supportTicket.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
  await logActivity(req, "SupportTicket", existing.id, "delete", `Archived ticket ${existing.code}`);
  res.json({ ok: true });
});

export default router;
