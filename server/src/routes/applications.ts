import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

function serialize(a: any) {
  return {
    id: a.id, code: a.code, status: a.status,
    businessName: a.businessName, category: a.category, contactPerson: a.contactPerson,
    phone: a.phone, whatsapp: a.whatsapp, email: a.email, city: a.city, country: a.country,
    instagram: a.instagram, existingWebsite: a.existingWebsite, isOperating: a.isOperating, description: a.description,
    needType: a.needType, plan: a.plan, needs: a.needs, otherFeatures: a.otherFeatures,
    hasContent: a.hasContent, files: a.files,
    launchTimeline: a.launchTimeline, contactMethod: a.contactMethod, bestTime: a.bestTime,
    meetingType: a.meetingType, additionalInfo: a.additionalInfo, hearAbout: a.hearAbout, referralCode: a.referralCode,
    salespersonId: a.salespersonId, salespersonName: a.salesperson?.fullName ?? null,
    leadId: a.leadId, leadCode: a.lead?.code ?? null, createdAt: a.createdAt,
  };
}

const include = {
  salesperson: { select: { fullName: true } },
  lead: { select: { code: true } },
} satisfies Prisma.ApplicationInclude;

router.get("/", async (req, res) => {
  const where: Prisma.ApplicationWhereInput = { archived: false };
  if (req.query.status && req.query.status !== "All") where.status = req.query.status as string;
  const q = (req.query.q as string | undefined)?.trim();
  if (q) where.OR = [{ businessName: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }];
  const rows = await prisma.application.findMany({ where, include, orderBy: { createdAt: "desc" } });
  res.json({ items: rows.map(serialize) });
});

router.get("/:id", async (req, res) => {
  const a = await prisma.application.findUnique({ where: { id: req.params.id }, include });
  if (!a) return res.status(404).json({ error: "Application not found" });
  res.json({ application: serialize(a) });
});

const STATUSES = ["Application Received", "Under Review", "Contact Scheduled", "Requirements Confirmed", "Proposal Sent", "Waiting for Approval", "Approved", "Website in Progress", "Ready for Review", "Launched", "Not Proceeding"];

router.patch("/:id", async (req, res) => {
  const parsed = z.object({ status: z.enum(STATUSES as [string, ...string[]]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid status" });
  const existing = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Application not found" });
  const updated = await prisma.application.update({ where: { id: existing.id }, data: { status: parsed.data.status }, include });
  await logActivity(req, "Application", updated.id, "update", `Application ${updated.code} → ${parsed.data.status}`);
  res.json({ application: serialize(updated) });
});

export default router;
