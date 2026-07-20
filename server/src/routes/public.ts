import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { nextApplicationCode, nextLeadCode, nextSupportCode, friendlyStatus } from "../lib/sales.js";

// ---------------------------------------------------------------------------
// PUBLIC, UNAUTHENTICATED endpoints for the IGNIS website (Phase 2).
// Rate-limited + honeypot-protected. Never exposes internal data.
// ---------------------------------------------------------------------------
const router = Router();

// ---- naive in-memory rate limit (per IP) ----
const hits = new Map<string, number[]>();
function rateLimit(max: number, windowMs: number) {
  return (req: any, res: any, next: any) => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    const arr = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: "Too many requests. Please try again shortly." });
    arr.push(now);
    hits.set(ip, arr);
    next();
  };
}

// ---- file uploads (local disk, type + size limited) ----
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "applications");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic",
  "application/pdf", "video/mp4", "video/quicktime",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED.has(file.mimetype)),
});

router.post("/uploads", rateLimit(30, 60_000), (req, res) => {
  upload.array("files", 8)(req, res, (err: any) => {
    if (err) return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "A file is larger than 15 MB." : "Upload failed." });
    const files = ((req.files as Express.Multer.File[]) ?? []).map((f) => ({
      name: f.originalname, url: `/uploads/applications/${f.filename}`, size: f.size, type: f.mimetype,
    }));
    res.json({ files });
  });
});

// ---- validate a salesperson referral code ----
router.get("/ref/:code", async (req, res) => {
  const code = String(req.params.code).trim().toUpperCase();
  const sp = await prisma.salesperson.findFirst({ where: { code, deletedAt: null, status: "Active" }, select: { fullName: true, code: true } });
  if (!sp) return res.json({ valid: false });
  res.json({ valid: true, salespersonName: sp.fullName, code: sp.code });
});

// ---- submit an application ----
const schema = z.object({
  businessName: z.string().min(1).max(160),
  category: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  existingWebsite: z.string().optional().nullable(),
  isOperating: z.boolean().optional(),
  description: z.string().max(2000).optional().nullable(),
  needType: z.string().optional().nullable(),
  plan: z.string().optional().nullable(),
  needs: z.record(z.any()).optional().nullable(),
  otherFeatures: z.string().optional().nullable(),
  hasContent: z.record(z.any()).optional().nullable(),
  files: z.array(z.object({ name: z.string(), url: z.string(), size: z.number(), type: z.string() })).optional().nullable(),
  launchTimeline: z.string().optional().nullable(),
  contactMethod: z.string().optional().nullable(),
  bestTime: z.string().optional().nullable(),
  meetingType: z.string().optional().nullable(),
  additionalInfo: z.string().max(2000).optional().nullable(),
  hearAbout: z.string().optional().nullable(),
  referralCode: z.string().optional().nullable(),
  consentContact: z.literal(true, { errorMap: () => ({ message: "Please consent to be contacted." }) }),
  privacyAgreed: z.literal(true, { errorMap: () => ({ message: "Please accept the privacy agreement." }) }),
  priceMayChange: z.boolean().optional(),
  _hp: z.string().optional(), // honeypot — must be empty
});

router.post("/applications", rateLimit(5, 60_000), async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Please check the form." });
  const b = parsed.data;
  if (b._hp) return res.status(200).json({ code: "APP-OK", expectedResponse: "within 1 business day" }); // silently drop bots

  // resolve salesperson from referral code (server-side — visitor can't set the ID)
  let salespersonId: string | null = null;
  if (b.referralCode) {
    const sp = await prisma.salesperson.findFirst({ where: { code: b.referralCode.trim().toUpperCase(), deletedAt: null, status: "Active" }, select: { id: true } });
    salespersonId = sp?.id ?? null;
  }
  // fall back to any active salesperson so a lead always has an owner (round-robin-ish: first active)
  if (!salespersonId) {
    const anySp = await prisma.salesperson.findFirst({ where: { deletedAt: null, status: "Active" }, orderBy: { createdAt: "asc" }, select: { id: true } });
    salespersonId = anySp?.id ?? null;
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const appCode = await nextApplicationCode(tx, now);
    let leadId: string | null = null;
    if (salespersonId) {
      const leadCode = await nextLeadCode(tx, now);
      const lead = await tx.lead.create({
        data: {
          code: leadCode, salespersonId, businessName: b.businessName, contactPerson: b.contactPerson ?? null,
          phone: b.phone ?? null, whatsapp: b.whatsapp ?? null, email: b.email || null, instagram: b.instagram ?? null,
          category: b.category ?? null, city: b.city ?? null, existingWebsite: b.existingWebsite ?? null,
          source: "Website Inquiry", status: "New", interestedService: b.plan ? `${b.plan} plan` : null,
          proposedMonthly: b.plan === "basic" ? 10 : b.plan === "standard" ? 20 : b.plan === "premium" ? 30 : null,
          notes: `From website application ${appCode}.` + (b.description ? `\n${b.description}` : ""),
          nextFollowUpDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        },
      });
      leadId = lead.id;
      await tx.leadActivity.create({ data: { leadId: lead.id, type: "note", summary: `New website application received (${appCode})`, createdBy: "website" } });
      // notify the assigned salesperson
      const sp = await tx.salesperson.findUnique({ where: { id: salespersonId }, select: { userId: true } });
      if (sp?.userId) {
        await tx.notification.create({ data: { type: "newApplication", severity: "attention", entityType: "Lead", entityId: lead.id, userId: sp.userId, message: `New application: ${b.businessName} (${appCode})` } });
      }
    }
    const app = await tx.application.create({
      data: {
        code: appCode, businessName: b.businessName, category: b.category ?? null, contactPerson: b.contactPerson ?? null,
        phone: b.phone ?? null, whatsapp: b.whatsapp ?? null, email: b.email || null, city: b.city ?? null, country: b.country ?? null,
        instagram: b.instagram ?? null, existingWebsite: b.existingWebsite ?? null, isOperating: b.isOperating ?? true, description: b.description ?? null,
        needType: b.needType ?? null, plan: b.plan ?? null, needs: (b.needs ?? undefined) as any, otherFeatures: b.otherFeatures ?? null,
        hasContent: (b.hasContent ?? undefined) as any, files: (b.files ?? undefined) as any,
        launchTimeline: b.launchTimeline ?? null, contactMethod: b.contactMethod ?? null, bestTime: b.bestTime ?? null,
        meetingType: b.meetingType ?? null, additionalInfo: b.additionalInfo ?? null, hearAbout: b.hearAbout ?? null, referralCode: b.referralCode ?? null,
        consentContact: b.consentContact, priceMayChange: b.priceMayChange ?? false, privacyAgreed: b.privacyAgreed,
        salespersonId, leadId, marketingSource: b.hearAbout ?? null,
      },
    });
    return app;
  });

  res.status(201).json({ code: result.code, expectedResponse: "within 1 business day" });
});

// ---- Client support request ----------------------------------------------
const PRIORITY_MAP: Record<string, string> = { Normal: "Low", Important: "High", Urgent: "Urgent" };
function internalCategory(requestType: string): string {
  const t = requestType.toLowerCase();
  if (t.includes("design")) return "Design Change";
  if (t.includes("bug") || t.includes("not opening") || t.includes("problem") || t.includes("error")) return "Bug Fix";
  if (t.includes("feature") || t.includes("new page")) return "New Feature";
  if (t.includes("domain") || t.includes("email")) return "Domain";
  if (t.includes("update") || t.includes("price") || t.includes("text") || t.includes("photo") || t.includes("service") || t.includes("product") || t.includes("content")) return "Content Change";
  return "Other";
}

const supportSchema = z.object({
  requestType: z.string().min(1),
  summary: z.string().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  requesterName: z.string().optional().nullable(),
  requesterEmail: z.string().email().optional().or(z.literal("")).nullable(),
  requesterPhone: z.string().optional().nullable(),
  requesterBusiness: z.string().min(1),
  requesterWebsite: z.string().optional().nullable(),
  clientCode: z.string().optional().nullable(),
  priority: z.enum(["Normal", "Important", "Urgent"]).default("Normal"),
  businessImpact: z.string().optional().nullable(),
  pageUrl: z.string().optional().nullable(),
  deviceInfo: z.string().optional().nullable(),
  browserInfo: z.string().optional().nullable(),
  problemStarted: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
  stepsToReproduce: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  contactMethod: z.string().optional().nullable(),
  files: z.array(z.object({ name: z.string(), url: z.string(), size: z.number(), type: z.string() })).optional().nullable(),
  _hp: z.string().optional(),
}).refine((d) => d.priority !== "Urgent" || (d.businessImpact && d.businessImpact.trim().length > 0), {
  message: "For urgent requests, please describe the business impact.", path: ["businessImpact"],
});

router.post("/support", rateLimit(8, 60_000), async (req, res) => {
  const parsed = supportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Please check the form." });
  const b = parsed.data;
  if (b._hp) return res.status(200).json({ reference: "SUP-OK", status: "Received" });

  // try to match an existing client
  const or: Prisma.ClientWhereInput[] = [];
  if (b.clientCode) or.push({ code: { equals: b.clientCode.trim().toUpperCase() } });
  if (b.requesterPhone) or.push({ phone: b.requesterPhone.trim() });
  if (b.requesterBusiness) or.push({ businessName: { equals: b.requesterBusiness.trim(), mode: "insensitive" } });
  const client = or.length ? await prisma.client.findFirst({ where: { deletedAt: null, OR: or }, include: { websites: { where: { deletedAt: null } }, assignments: { where: { status: "Active" }, include: { currentSalesperson: { select: { userId: true } } } } } }) : null;

  let websiteId: string | null = null;
  if (client) {
    if (b.requesterWebsite) {
      const w = client.websites.find((x) => x.primaryUrl && b.requesterWebsite && (x.primaryUrl.includes(b.requesterWebsite!) || b.requesterWebsite!.includes(x.domainName ?? "___")));
      websiteId = w?.id ?? (client.websites.length === 1 ? client.websites[0].id : null);
    } else if (client.websites.length === 1) websiteId = client.websites[0].id;
  }

  const now = new Date();
  const created = await prisma.$transaction(async (tx) => {
    const code = await nextSupportCode(tx, now);
    const ticket = await tx.supportTicket.create({
      data: {
        code, requestedDate: now, requestSource: "Website Form",
        clientId: client?.id ?? null, websiteId,
        category: internalCategory(b.requestType), summary: b.summary, priority: PRIORITY_MAP[b.priority] ?? "Low",
        status: "Not Started", dueDate: b.dueDate ?? null,
        requestType: b.requestType, requesterName: b.requesterName ?? null, requesterEmail: b.requesterEmail || null,
        requesterPhone: b.requesterPhone ?? null, requesterBusiness: b.requesterBusiness, requesterWebsite: b.requesterWebsite ?? null,
        pageUrl: b.pageUrl ?? null, deviceInfo: b.deviceInfo ?? null, browserInfo: b.browserInfo ?? null,
        problemStarted: b.problemStarted ?? null, frequency: b.frequency ?? null, stepsToReproduce: b.stepsToReproduce ?? null,
        businessImpact: b.businessImpact ?? null, files: (b.files ?? undefined) as any,
        notes: b.description ?? null,
      },
    });
    // notify the client's current salesperson (if any)
    const spUserId = client?.assignments?.[0]?.currentSalesperson?.userId;
    if (spUserId) {
      await tx.notification.create({ data: { type: "supportRequest", severity: b.priority === "Urgent" ? "critical" : "attention", entityType: "SupportTicket", entityId: ticket.id, userId: spUserId, message: `New ${b.priority.toLowerCase()} support request: ${b.requesterBusiness} (${code})` } });
    }
    return ticket;
  });

  res.status(201).json({ reference: created.code, status: "Received", expectedResponse: b.priority === "Urgent" ? "as soon as possible" : "within 1–2 business days" });
});

// ---- Track a request (reference + contact verification) -------------------
router.post("/track", rateLimit(20, 60_000), async (req, res) => {
  const ref = String(req.body?.reference ?? "").trim().toUpperCase();
  const contact = String(req.body?.contact ?? "").trim().toLowerCase();
  if (!ref || !contact) return res.status(400).json({ error: "Enter your reference number and email or phone." });

  const t = await prisma.supportTicket.findFirst({ where: { code: ref, deletedAt: null }, include: { client: { select: { phone: true, businessName: true } } } });
  if (!t) return res.status(404).json({ error: "We couldn't find a request with that reference." });

  // verify the contact matches the requester or the linked client (privacy §11)
  const candidates = [t.requesterEmail, t.requesterPhone, t.client?.phone].filter(Boolean).map((x) => x!.toLowerCase().replace(/\s/g, ""));
  if (!candidates.includes(contact.replace(/\s/g, ""))) {
    return res.status(403).json({ error: "That email or phone doesn't match this request." });
  }
  res.json({
    reference: t.code, summary: t.summary, requestType: t.requestType,
    status: friendlyStatus(t.status), submittedAt: t.requestedDate,
    completedAt: t.completedDate,
  });
});

export default router;
