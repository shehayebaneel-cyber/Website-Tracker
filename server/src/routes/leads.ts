import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { requireSalesAdmin, nextLeadCode, nextAssignmentCode } from "../lib/sales.js";
import { nextClientCode, nextWebsiteCode } from "../lib/ids.js";
import { toNum, firstOfMonth } from "../lib/calc.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

function serialize(l: any) {
  return {
    id: l.id, code: l.code, salespersonId: l.salespersonId,
    salespersonName: l.salesperson?.fullName ?? null,
    businessName: l.businessName, contactPerson: l.contactPerson, phone: l.phone, whatsapp: l.whatsapp,
    email: l.email, instagram: l.instagram, category: l.category, city: l.city, existingWebsite: l.existingWebsite,
    source: l.source, dateAdded: l.dateAdded, lastContactDate: l.lastContactDate, nextFollowUpDate: l.nextFollowUpDate,
    interestedService: l.interestedService, proposedMonthly: l.proposedMonthly != null ? toNum(l.proposedMonthly) : null,
    proposedSetup: l.proposedSetup != null ? toNum(l.proposedSetup) : null, status: l.status, closeChance: l.closeChance,
    lostReason: l.lostReason, notes: l.notes, convertedClientId: l.convertedClientId,
  };
}

// ---- duplicate detection --------------------------------------------------
async function findDuplicates(fields: { businessName?: string; phone?: string; whatsapp?: string; instagram?: string; existingWebsite?: string }, salespersonId?: string) {
  const or: Prisma.LeadWhereInput[] = [];
  if (fields.businessName) or.push({ businessName: { equals: fields.businessName, mode: "insensitive" } });
  if (fields.phone) or.push({ phone: fields.phone });
  if (fields.whatsapp) or.push({ whatsapp: fields.whatsapp });
  if (fields.instagram) or.push({ instagram: { equals: fields.instagram, mode: "insensitive" } });
  if (fields.existingWebsite) or.push({ existingWebsite: { equals: fields.existingWebsite, mode: "insensitive" } });
  if (or.length === 0) return [];
  const where: Prisma.LeadWhereInput = { deletedAt: null, OR: or };
  if (salespersonId) where.salespersonId = salespersonId; // salespeople only see their own possible dupes
  const rows = await prisma.lead.findMany({ where, include: { salesperson: { select: { fullName: true } } }, take: 5 });
  return rows.map(serialize);
}

router.post("/check-duplicate", async (req, res) => {
  const dups = await findDuplicates(req.body ?? {}, req.salespersonId);
  res.json({ duplicates: dups });
});

// ---- list -----------------------------------------------------------------
router.get("/", async (req, res) => {
  const where: Prisma.LeadWhereInput = { deletedAt: null };
  if (req.salespersonId) where.salespersonId = req.salespersonId;
  else if (req.query.salespersonId) where.salespersonId = req.query.salespersonId as string;
  if (req.query.status && req.query.status !== "All") where.status = req.query.status as string;
  const q = (req.query.q as string | undefined)?.trim();
  if (q) where.OR = [{ businessName: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }, { instagram: { contains: q, mode: "insensitive" } }];

  const rows = await prisma.lead.findMany({ where, include: { salesperson: { select: { fullName: true } } }, orderBy: { updatedAt: "desc" } });
  res.json({ items: rows.map(serialize) });
});

// ---- one (+ activities) ---------------------------------------------------
router.get("/:id", async (req, res) => {
  const l = await prisma.lead.findFirst({
    where: { id: req.params.id, deletedAt: null, ...(req.salespersonId ? { salespersonId: req.salespersonId } : {}) },
    include: { salesperson: { select: { fullName: true } }, activities: { orderBy: { createdAt: "desc" } } },
  });
  if (!l) return res.status(404).json({ error: "Lead not found" });
  res.json({ lead: serialize(l), activities: l.activities.map((a) => ({ id: a.id, type: a.type, summary: a.summary, user: a.createdBy, createdAt: a.createdAt })) });
});

// ---- create ---------------------------------------------------------------
const upsert = z.object({
  businessName: z.string().min(1),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  existingWebsite: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  lastContactDate: z.coerce.date().optional().nullable(),
  nextFollowUpDate: z.coerce.date().optional().nullable(),
  interestedService: z.string().optional().nullable(),
  proposedMonthly: z.coerce.number().min(0).optional().nullable(),
  proposedSetup: z.coerce.number().min(0).optional().nullable(),
  status: z.string().optional(),
  closeChance: z.coerce.number().int().min(0).max(100).optional().nullable(),
  lostReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  salespersonId: z.string().optional(), // admin may assign; salesperson forced to self
});

router.post("/", async (req, res) => {
  const parsed = upsert.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data" });
  const b = parsed.data;

  // whose lead?
  let salespersonId = req.salespersonId;
  if (!salespersonId) {
    salespersonId = b.salespersonId;
    if (!salespersonId) return res.status(400).json({ error: "Select a salesperson for this lead" });
  }
  const sp = await prisma.salesperson.findFirst({ where: { id: salespersonId, deletedAt: null } });
  if (!sp) return res.status(400).json({ error: "Salesperson not found" });

  const created = await prisma.$transaction(async (tx) => {
    const code = await nextLeadCode(tx, new Date());
    const lead = await tx.lead.create({
      data: {
        code, salespersonId: sp.id, businessName: b.businessName, contactPerson: b.contactPerson ?? null,
        phone: b.phone ?? null, whatsapp: b.whatsapp ?? null, email: b.email ?? null, instagram: b.instagram ?? null,
        category: b.category ?? null, city: b.city ?? null, existingWebsite: b.existingWebsite ?? null,
        source: b.source ?? null, lastContactDate: b.lastContactDate ?? null, nextFollowUpDate: b.nextFollowUpDate ?? null,
        interestedService: b.interestedService ?? null, proposedMonthly: b.proposedMonthly ?? null,
        proposedSetup: b.proposedSetup ?? null, status: b.status ?? "New", closeChance: b.closeChance ?? null, notes: b.notes ?? null,
      },
    });
    await tx.leadActivity.create({ data: { leadId: lead.id, type: "note", summary: "Lead created", createdBy: req.user?.email ?? null } });
    return lead;
  });
  await logActivity(req, "Lead", created.id, "create", `Created lead ${created.code} — ${created.businessName}`);
  res.status(201).json({ lead: serialize(created) });
});

// ---- update ---------------------------------------------------------------
router.patch("/:id", async (req, res) => {
  const parsed = upsert.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data" });
  const existing = await prisma.lead.findFirst({ where: { id: req.params.id, deletedAt: null, ...(req.salespersonId ? { salespersonId: req.salespersonId } : {}) } });
  if (!existing) return res.status(404).json({ error: "Lead not found" });

  const b: any = parsed.data;
  const data: any = {};
  for (const k of ["businessName", "contactPerson", "phone", "whatsapp", "email", "instagram", "category", "city", "existingWebsite", "source", "lastContactDate", "nextFollowUpDate", "interestedService", "proposedMonthly", "proposedSetup", "status", "closeChance", "lostReason", "notes"]) {
    if (b[k] !== undefined) data[k] = b[k] === "" ? null : b[k];
  }
  // only admin may reassign a lead to another salesperson
  if (b.salespersonId && req.isSalesAdmin) data.salespersonId = b.salespersonId;

  const updated = await prisma.lead.update({ where: { id: existing.id }, data });
  if (b.status && b.status !== existing.status) {
    await prisma.leadActivity.create({ data: { leadId: updated.id, type: "status_change", summary: `Status: ${existing.status} → ${b.status}`, createdBy: req.user?.email ?? null } });
  }
  await logActivity(req, "Lead", updated.id, "update", `Updated lead ${updated.code}`);
  res.json({ lead: serialize(updated) });
});

// ---- add an activity / note ----------------------------------------------
router.post("/:id/activity", async (req, res) => {
  const existing = await prisma.lead.findFirst({ where: { id: req.params.id, deletedAt: null, ...(req.salespersonId ? { salespersonId: req.salespersonId } : {}) } });
  if (!existing) return res.status(404).json({ error: "Lead not found" });
  const summary = String(req.body?.summary ?? "").trim();
  if (!summary) return res.status(400).json({ error: "A note is required" });
  const act = await prisma.leadActivity.create({ data: { leadId: existing.id, type: req.body?.type || "note", summary, createdBy: req.user?.email ?? null } });
  // touching contact date
  await prisma.lead.update({ where: { id: existing.id }, data: { lastContactDate: new Date() } });
  res.status(201).json({ activity: { id: act.id, type: act.type, summary: act.summary, user: act.createdBy, createdAt: act.createdAt } });
});

// ---- convert to client (admin) -------------------------------------------
const convertSchema = z.object({
  projectName: z.string().optional(),
  monthlyFee: z.coerce.number().min(0),
  setupFee: z.coerce.number().min(0).optional(),
  billingDay: z.coerce.number().int().min(1).max(31).optional(),
  subscriptionStartDate: z.coerce.date().optional(),
  servicePlan: z.string().optional(),
  commissionMethod: z.enum(["Fixed", "Percentage"]).optional(),
  commissionAmount: z.coerce.number().min(0).optional(),
  commissionPercent: z.coerce.number().min(0).max(100).optional(),
});

router.post("/:id/convert", requireSalesAdmin, async (req, res) => {
  const parsed = convertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data" });
  const b = parsed.data;
  const lead = await prisma.lead.findFirst({ where: { id: req.params.id, deletedAt: null }, include: { salesperson: true } });
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (lead.convertedClientId) return res.status(409).json({ error: "This lead has already been converted" });

  const startDate = b.subscriptionStartDate ?? new Date();
  const result = await prisma.$transaction(async (tx) => {
    const clientCode = await nextClientCode(tx);
    const client = await tx.client.create({
      data: {
        code: clientCode, businessName: lead.businessName, contactName: lead.contactPerson,
        phone: lead.phone, website: lead.existingWebsite, city: lead.city,
        subscriptionStartDate: startDate, billingDay: b.billingDay ?? 1, monthlyFee: b.monthlyFee,
        servicePlan: b.servicePlan ?? null, status: "Active", paymentMethod: null,
        notes: `Converted from lead ${lead.code}.`,
      },
    });
    const websiteCode = await nextWebsiteCode(tx, client.code);
    const website = await tx.website.create({
      data: { code: websiteCode, clientId: client.id, projectName: b.projectName ?? lead.businessName, status: "Planning", projectStartDate: startDate, primaryUrl: lead.existingWebsite },
    });
    const asgCode = await nextAssignmentCode(tx);
    await tx.clientAssignment.create({
      data: {
        code: asgCode, clientId: client.id, websiteId: website.id,
        originalSalespersonId: lead.salespersonId, currentSalespersonId: lead.salespersonId,
        startDate, effectiveBillingMonth: firstOfMonth(startDate), status: "Active", assignedBy: req.user?.email ?? null,
        commissionMethod: b.commissionMethod ?? lead.salesperson.commissionMethod,
        commissionAmount: b.commissionAmount ?? toNum(lead.salesperson.commissionAmount),
        commissionPercent: b.commissionPercent ?? toNum(lead.salesperson.commissionPercent),
      },
    });
    await tx.lead.update({ where: { id: lead.id }, data: { status: "Won", convertedClientId: client.id } });
    await tx.leadActivity.create({ data: { leadId: lead.id, type: "convert", summary: `Converted to client ${client.code}`, createdBy: req.user?.email ?? null } });
    return { client, website };
  });
  await logActivity(req, "Lead", lead.id, "convert", `Converted lead ${lead.code} → client ${result.client.code}`);
  res.json({ clientId: result.client.id, clientCode: result.client.code, websiteId: result.website.id });
});

export default router;
