// ---------------------------------------------------------------------------
// Admin editing of the pricing catalogue.
//
// Section 24 of the spec: every price, limit, description and rule the public
// site shows must be changeable here, without rebuilding the website. That is
// only true because the public pages read the catalogue at runtime — so this
// router is the other half of "the database is the single source of truth".
//
// Gated to the `settings` section (OWNER), like the rest of configuration.
// ---------------------------------------------------------------------------

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { loadCatalogue } from "../lib/pricingCatalogue.js";
import { maxStandardMonthly } from "../lib/pricing.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const money = (d: unknown) => (d == null ? null : Number(d));

// ---------------------------------------------------------------------------
// GET / — the whole catalogue, including inactive rows (the admin sees all).
// ---------------------------------------------------------------------------
router.get("/", async (_req, res) => {
  const [base, systems, packs, oneTime, external, comparison, setups, faqs, terms, businessTypes, content] =
    await Promise.all([
      prisma.baseWebsite.findFirst({ include: { inclusions: { orderBy: { order: "asc" } } } }),
      prisma.coreSystem.findMany({
        orderBy: { order: "asc" },
        include: { inclusions: { orderBy: { order: "asc" } }, limits: { orderBy: { order: "asc" } } },
      }),
      prisma.featurePack.findMany({ orderBy: { order: "asc" }, include: { features: { orderBy: { order: "asc" } } } }),
      prisma.oneTimeService.findMany({ orderBy: { order: "asc" } }),
      prisma.externalCost.findMany({ orderBy: { order: "asc" } }),
      prisma.comparisonRow.findMany({ orderBy: { order: "asc" } }),
      prisma.recommendedSetup.findMany({ orderBy: { order: "asc" } }),
      prisma.pricingFaq.findMany({ orderBy: { order: "asc" } }),
      prisma.pricingTerm.findMany({ orderBy: [{ kind: "asc" }, { order: "asc" }] }),
      prisma.businessType.findMany({ orderBy: { order: "asc" } }),
      prisma.pricingContent.findMany({ orderBy: { key: "asc" } }),
    ]);

  // Derived, so the admin always sees the true ceiling of what they just edited
  // rather than a number typed into copy somewhere.
  const cat = await loadCatalogue();

  res.json({
    base: base && { ...base, price: money(base.price) },
    systems: systems.map((s) => ({ ...s, price: money(s.price) })),
    packs: packs.map((p) => ({ ...p, price: money(p.price) })),
    oneTime: oneTime.map((o) => ({ ...o, startingPrice: money(o.startingPrice) })),
    external,
    comparison,
    setups,
    faqs,
    terms,
    businessTypes,
    content,
    maxStandardMonthly: maxStandardMonthly(cat),
  });
});

// ---------------------------------------------------------------------------
// Generic helpers — every entity edits the same way.
// ---------------------------------------------------------------------------

type Model =
  | "coreSystem" | "featurePack" | "oneTimeService" | "externalCost"
  | "comparisonRow" | "recommendedSetup" | "pricingFaq" | "pricingTerm"
  | "businessType" | "pricingContent" | "systemLimit";

/** What the admin may change, per entity. Anything not listed is ignored. */
const FIELDS: Record<Model, string[]> = {
  coreSystem: ["name", "shortName", "heading", "description", "ctaLabel", "price", "icon", "order", "active"],
  systemLimit: ["label", "unitLabel", "baseValue", "upgradedValue", "helpText", "order", "active"],
  featurePack: [
    "name", "blurb", "description", "price", "icon", "requiresSystems", "compatibleSystems",
    "requiresReason", "raisesLimits", "recommendedFor", "order", "active",
  ],
  oneTimeService: ["name", "description", "category", "startingPrice", "isQuote", "order", "active"],
  externalCost: ["name", "description", "provider", "costType", "order", "active"],
  comparisonRow: ["label", "informational", "booking", "store", "both", "note", "order", "active"],
  recommendedSetup: ["name", "description", "systemKeys", "packKeys", "icon", "order", "active"],
  pricingFaq: ["question", "answer", "order", "active"],
  pricingTerm: ["kind", "title", "body", "order", "active"],
  businessType: ["name", "icon", "recommendedSystems", "priorityPacks", "order", "active"],
  pricingContent: ["label", "value", "active"],
};

const DECIMALS: Partial<Record<Model, string[]>> = {
  coreSystem: ["price"],
  featurePack: ["price"],
  oneTimeService: ["startingPrice"],
};

function pick(model: Model, body: any) {
  const out: Record<string, unknown> = {};
  for (const f of FIELDS[model]) {
    if (body[f] !== undefined) out[f] = body[f];
  }
  // Money arrives as a string from a form field; store it as a number or null,
  // never as NaN.
  for (const f of DECIMALS[model] ?? []) {
    if (out[f] !== undefined) {
      const n = out[f] === "" || out[f] === null ? null : Number(out[f]);
      out[f] = n != null && Number.isFinite(n) ? n : null;
    }
  }
  return out;
}

function crud(path: string, model: Model, label: (row: any) => string) {
  router.patch(`/${path}/:id`, async (req, res) => {
    const data = pick(model, req.body);
    if (!Object.keys(data).length) return res.status(400).json({ error: "Nothing to update." });
    const row = await (prisma[model] as any).update({ where: { id: req.params.id }, data });
    await logActivity(req, "Pricing", row.id, "update", `Updated ${label(row)}`);
    res.json({ ok: true });
  });

  router.post(`/${path}`, async (req, res) => {
    const data = pick(model, req.body);
    // `key` identifies a record for the whole system, so it is set once at
    // creation and never edited afterwards.
    const key = typeof req.body.key === "string" ? req.body.key.trim() : "";
    if (!key) return res.status(400).json({ error: "A key is required." });
    try {
      const row = await (prisma[model] as any).create({ data: { ...data, key } });
      await logActivity(req, "Pricing", row.id, "create", `Created ${label(row)}`);
      res.status(201).json({ ok: true, id: row.id });
    } catch {
      res.status(400).json({ error: `"${key}" already exists.` });
    }
  });
}

// Entities with a key of their own.
crud("systems", "coreSystem", (r) => `core system ${r.name}`);
crud("packs", "featurePack", (r) => `feature pack ${r.name}`);
crud("one-time", "oneTimeService", (r) => `one-time service ${r.name}`);
crud("external", "externalCost", (r) => `external cost ${r.name}`);
crud("setups", "recommendedSetup", (r) => `example setup ${r.name}`);
crud("business-types", "businessType", (r) => `business type ${r.name}`);
crud("content", "pricingContent", (r) => `content ${r.key}`);

// Keyless rows: created inline, no unique key to collide on.
for (const [path, model, label] of [
  ["comparison", "comparisonRow", (r: any) => `comparison row ${r.label}`],
  ["faqs", "pricingFaq", (r: any) => `FAQ ${r.question}`],
  ["terms", "pricingTerm", (r: any) => `${r.kind} ${r.title ?? ""}`],
] as const) {
  router.patch(`/${path}/:id`, async (req, res) => {
    const row = await (prisma[model] as any).update({
      where: { id: req.params.id },
      data: pick(model, req.body),
    });
    await logActivity(req, "Pricing", row.id, "update", `Updated ${label(row)}`);
    res.json({ ok: true });
  });
  router.post(`/${path}`, async (req, res) => {
    const row = await (prisma[model] as any).create({ data: pick(model, req.body) });
    await logActivity(req, "Pricing", row.id, "create", `Created ${label(row)}`);
    res.status(201).json({ ok: true, id: row.id });
  });
  router.delete(`/${path}/:id`, async (req, res) => {
    await (prisma[model] as any).delete({ where: { id: req.params.id } });
    await logActivity(req, "Pricing", req.params.id, "delete", `Deleted a ${path} row`);
    res.json({ ok: true });
  });
}

// ---------------------------------------------------------------------------
// The base website: one row, edited in place.
// ---------------------------------------------------------------------------
const baseSchema = z.object({
  name: z.string().min(1).optional(),
  heading: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  ctaLabel: z.string().min(1).optional(),
  price: z.coerce.number().min(0).optional(),
  priceNote: z.string().optional(),
  includedSections: z.coerce.number().int().min(0).optional(),
  monthlyUpdates: z.coerce.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

router.patch("/base/:id", async (req, res) => {
  const parsed = baseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Check the values and try again." });
  await prisma.baseWebsite.update({ where: { id: req.params.id }, data: parsed.data });
  await logActivity(req, "Pricing", req.params.id, "update", "Updated the base website");
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Bullet lists (base inclusions, system inclusions, pack features).
// They are ordered text, so the whole list is replaced in one go.
// ---------------------------------------------------------------------------
const listSchema = z.object({ labels: z.array(z.string().trim().min(1)).max(200) });

router.put("/base/:id/inclusions", async (req, res) => {
  const parsed = listSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid list." });
  await prisma.$transaction([
    prisma.baseInclusion.deleteMany({ where: { baseId: req.params.id } }),
    prisma.baseInclusion.createMany({
      data: parsed.data.labels.map((label, order) => ({ baseId: req.params.id, label, order })),
    }),
  ]);
  await logActivity(req, "Pricing", req.params.id, "update", "Updated what the base website includes");
  res.json({ ok: true });
});

router.put("/systems/:id/inclusions", async (req, res) => {
  const parsed = listSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid list." });
  await prisma.$transaction([
    prisma.systemInclusion.deleteMany({ where: { systemId: req.params.id } }),
    prisma.systemInclusion.createMany({
      data: parsed.data.labels.map((label, order) => ({ systemId: req.params.id, label, order })),
    }),
  ]);
  await logActivity(req, "Pricing", req.params.id, "update", "Updated what a core system includes");
  res.json({ ok: true });
});

router.put("/packs/:id/features", async (req, res) => {
  const parsed = listSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid list." });
  await prisma.$transaction([
    prisma.packFeature.deleteMany({ where: { packId: req.params.id } }),
    prisma.packFeature.createMany({
      data: parsed.data.labels.map((label, order) => ({ packId: req.params.id, label, order })),
    }),
  ]);
  await logActivity(req, "Pricing", req.params.id, "update", "Updated what a feature pack includes");
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// System limits — created against their system, edited like anything else.
// ---------------------------------------------------------------------------
router.post("/systems/:id/limits", async (req, res) => {
  const key = typeof req.body.key === "string" ? req.body.key.trim() : "";
  if (!key) return res.status(400).json({ error: "A key is required." });
  try {
    const row = await prisma.systemLimit.create({
      data: { ...(pick("systemLimit", req.body) as any), key, systemId: req.params.id },
    });
    res.status(201).json({ ok: true, id: row.id });
  } catch {
    res.status(400).json({ error: `"${key}" already exists on this system.` });
  }
});

router.patch("/limits/:id", async (req, res) => {
  await prisma.systemLimit.update({ where: { id: req.params.id }, data: pick("systemLimit", req.body) });
  await logActivity(req, "Pricing", req.params.id, "update", "Updated a system limit");
  res.json({ ok: true });
});

export default router;
