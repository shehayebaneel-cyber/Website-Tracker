import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { nextWebsiteCode } from "../lib/ids.js";
import { serializeWebsite } from "../lib/serialize.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const upsertSchema = z.object({
  clientId: z.string().min(1),
  projectName: z.string().optional().nullable(),
  primaryUrl: z.string().optional().nullable(),
  status: z.string().optional(),
  projectStartDate: z.coerce.date().optional().nullable(),
  launchDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  // domain
  domainName: z.string().optional().nullable(),
  domainProvider: z.string().optional().nullable(),
  domainOwner: z.string().optional().nullable(),
  domainCost: z.coerce.number().min(0).optional().nullable(),
  domainPurchaseDate: z.coerce.date().optional().nullable(),
  domainRenewalDate: z.coerce.date().optional().nullable(),
  domainAutoRenew: z.coerce.boolean().optional(),
  // hosting
  hostingProvider: z.string().optional().nullable(),
  hostingOwner: z.string().optional().nullable(),
  hostingPlan: z.string().optional().nullable(),
  hostingCost: z.coerce.number().min(0).optional().nullable(),
  hostingRenewalDate: z.coerce.date().optional().nullable(),
  hostingAutoRenew: z.coerce.boolean().optional(),
  // ssl
  sslExpiryDate: z.coerce.date().optional().nullable(),
  // tech
  repositoryUrl: z.string().optional().nullable(),
  deploymentPlatform: z.string().optional().nullable(),
  adminUrl: z.string().optional().nullable(),
  analyticsInstalled: z.coerce.boolean().optional(),
  searchConsoleInstalled: z.coerce.boolean().optional(),
  lastBackupDate: z.coerce.date().optional().nullable(),
  lastWebsiteUpdate: z.coerce.date().optional().nullable(),
  credentialLocation: z.string().optional().nullable(),
  techNotes: z.string().optional().nullable(),
});

// ---- List -----------------------------------------------------------------
router.get("/", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const status = req.query.status as string | undefined;
  const clientId = req.query.clientId as string | undefined;
  const sort = (req.query.sort as string) || "code";
  const order = req.query.order === "desc" ? "desc" : "asc";
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  const pageSize = Math.min(200, Math.max(1, parseInt((req.query.pageSize as string) || "50", 10)));

  const where: Prisma.WebsiteWhereInput = { deletedAt: null };
  if (status && status !== "All") where.status = status;
  if (clientId) where.clientId = clientId;
  if (q) {
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { projectName: { contains: q, mode: "insensitive" } },
      { primaryUrl: { contains: q, mode: "insensitive" } },
      { domainName: { contains: q, mode: "insensitive" } },
      { client: { businessName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const sortable: Record<string, Prisma.WebsiteOrderByWithRelationInput> = {
    code: { code: order },
    status: { status: order },
    domainRenewalDate: { domainRenewalDate: order },
    hostingRenewalDate: { hostingRenewalDate: order },
    sslExpiryDate: { sslExpiryDate: order },
  };

  const [total, rows] = await Promise.all([
    prisma.website.count({ where }),
    prisma.website.findMany({
      where,
      include: { client: { select: { businessName: true, code: true } } },
      orderBy: sortable[sort] ?? { code: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({
    items: rows.map((w) => ({
      ...serializeWebsite(w),
      clientName: w.client.businessName,
      clientCode: w.client.code,
    })),
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  });
});

// ---- Get one --------------------------------------------------------------
router.get("/:id", async (req, res) => {
  const w = await prisma.website.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { client: { select: { businessName: true, code: true } } },
  });
  if (!w) return res.status(404).json({ error: "Website not found" });
  res.json({ website: { ...serializeWebsite(w), clientName: w.client.businessName, clientCode: w.client.code } });
});

// ---- Create ---------------------------------------------------------------
router.post("/", async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });

  const client = await prisma.client.findFirst({ where: { id: parsed.data.clientId, deletedAt: null } });
  if (!client) return res.status(400).json({ error: "Client not found — cannot attach website" });

  const created = await prisma.$transaction(async (tx) => {
    const code = await nextWebsiteCode(tx, client.code);
    const { clientId, ...rest } = parsed.data;
    return tx.website.create({
      data: { code, clientId: client.id, ...cleanUpsert(rest) },
    });
  });
  await logActivity(req, "Website", created.id, "create", `Created website ${created.code} for ${client.businessName}`);
  res.status(201).json({ website: serializeWebsite(created) });
});

// ---- Update ---------------------------------------------------------------
router.patch("/:id", async (req, res) => {
  const parsed = upsertSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
  const existing = await prisma.website.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: "Website not found" });

  const { clientId, ...rest } = parsed.data;
  const updated = await prisma.website.update({ where: { id: existing.id }, data: cleanUpsert(rest) });
  await logActivity(req, "Website", updated.id, "update", `Updated website ${updated.code}`);
  res.json({ website: serializeWebsite(updated) });
});

// ---- Soft delete ----------------------------------------------------------
router.delete("/:id", async (req, res) => {
  const existing = await prisma.website.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: "Website not found" });
  await prisma.website.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
  await logActivity(req, "Website", existing.id, "delete", `Archived website ${existing.code}`);
  res.json({ ok: true });
});

// Drop undefined keys so PATCH only touches provided fields.
function cleanUpsert<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as any)[k] = v;
  }
  return out;
}

export default router;
