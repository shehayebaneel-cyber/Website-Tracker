// ---------------------------------------------------------------------------
// PUBLIC, UNAUTHENTICATED pricing endpoints for the IGNIS website.
//
// Mounted under /api/public/pricing, before requireAuth.
//
//   GET  /catalogue      everything the pricing pages render from
//   POST /quote          server-authoritative price for a selection
//   POST /configurations submit a finished Plan Builder configuration
//
// The public app may compute a live estimate client-side for responsiveness,
// but /quote is the authority: the submitted configuration is always re-priced
// here before being stored, so a tampered or stale client can never book a
// price we never offered.
// ---------------------------------------------------------------------------

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { loadCatalogue } from "../lib/pricingCatalogue.js";
import { quote } from "../lib/pricing.js";
import { nextLeadCode } from "../lib/sales.js";

const router = Router();

// ---- naive in-memory rate limit (per IP), same shape as public.ts ----
const hits = new Map<string, number[]>();
function rateLimit(max: number, windowMs: number) {
  return (req: any, res: any, next: any) => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    const arr = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
    if (arr.length >= max) {
      return res.status(429).json({ error: "Too many requests. Please try again shortly." });
    }
    arr.push(now);
    hits.set(ip, arr);
    next();
  };
}

const money = (d: unknown) => (d == null ? null : Number(d));

// ---------------------------------------------------------------------------
// GET /catalogue — one payload for Plans, Features, the Builder and the FAQ.
// ---------------------------------------------------------------------------
router.get("/catalogue", async (_req, res) => {
  const [plans, categories, addOns, capacity, comparison, faqs, terms, businessTypes] =
    await Promise.all([
      prisma.pricingPlan.findMany({
        where: { active: true },
        orderBy: { order: "asc" },
        include: {
          inclusions: { where: { active: true }, orderBy: { order: "asc" } },
        },
      }),
      prisma.addOnCategory.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
      prisma.addOn.findMany({
        where: { active: true },
        orderBy: [{ order: "asc" }],
        include: { dependencies: true, category: { select: { key: true } } },
      }),
      prisma.capacityUpgrade.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
      prisma.comparisonRow.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
      prisma.pricingFaq.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
      prisma.pricingTerm.findMany({ where: { active: true }, orderBy: [{ kind: "asc" }, { order: "asc" }] }),
      prisma.businessType.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    ]);

  res.json({
    plans: plans.map((p) => ({
      key: p.key,
      name: p.name,
      heading: p.heading,
      description: p.description,
      bestFor: p.bestFor,
      basePrice: money(p.basePrice),
      priceIsFrom: p.priceIsFrom,
      priceNote: p.priceNote,
      ctaLabel: p.ctaLabel,
      addOnHint: p.addOnHint,
      coreSystemMode: p.coreSystemMode,
      bothSystemsPrice: money(p.bothSystemsPrice),
      included: {
        sections: p.includedSections,
        updates: p.includedUpdates,
        products: p.includedProducts,
        services: p.includedServices,
        staff: p.includedStaff,
        locations: p.includedLocations,
      },
      popular: p.popular,
      order: p.order,
      inclusions: p.inclusions.map((i) => ({ label: i.label, coreSystem: i.coreSystem })),
    })),
    categories: categories.map((c) => ({ key: c.key, name: c.name, blurb: c.blurb, icon: c.icon })),
    addOns: addOns.map((a) => ({
      key: a.key,
      categoryKey: a.category.key,
      name: a.name,
      blurb: a.blurb,
      bestFor: a.bestFor,
      icon: a.icon,
      includes: a.includes,
      pricingType: a.pricingType,
      price: money(a.price),
      priceIsFrom: a.priceIsFrom,
      priceLabel: a.priceLabel,
      minPlan: a.minPlan,
      includedInPlans: a.includedInPlans,
      bundledWith: a.bundledWith,
      recommendedFor: a.recommendedFor,
      popular: a.popular,
      dependencies: a.dependencies.map((d) => ({
        requiresType: d.requiresType,
        requiresKey: d.requiresKey,
        note: d.note,
      })),
    })),
    capacity: capacity.map((c) => ({
      key: c.key,
      name: c.name,
      unitLabel: c.unitLabel,
      stepSize: c.stepSize,
      pricePerStep: money(c.pricePerStep),
      maxSteps: c.maxSteps,
      appliesToPlans: c.appliesToPlans,
      requiresCoreSystem: c.requiresCoreSystem,
      helpText: c.helpText,
    })),
    comparison: comparison.map((r) => ({
      label: r.label, basic: r.basic, standard: r.standard, premium: r.premium, note: r.note,
    })),
    faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
    glossary: terms.filter((t) => t.kind === "glossary").map((t) => ({ title: t.title, body: t.body })),
    terms: terms.filter((t) => t.kind === "term").map((t) => t.body),
    externalCosts: terms.filter((t) => t.kind === "external").map((t) => t.body),
    businessTypes: businessTypes.map((b) => ({
      key: b.key, name: b.name, icon: b.icon,
      recommendedPlan: b.recommendedPlan, recommendedCore: b.recommendedCore,
      priorityCategories: b.priorityCategories, priorityAddOns: b.priorityAddOns,
    })),
  });
});

// ---------------------------------------------------------------------------
// POST /quote — price a selection.
// ---------------------------------------------------------------------------
const selectionSchema = z.object({
  planKey: z.string().min(1),
  coreSystem: z.enum(["booking", "store", "both"]).nullish(),
  capacities: z.record(z.number().int().min(0)).optional(),
  addOnKeys: z.array(z.string()).max(100).optional(),
});

router.post("/quote", rateLimit(120, 60_000), async (req, res) => {
  const parsed = selectionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid selection." });
  const cat = await loadCatalogue();
  res.json(quote(cat, parsed.data));
});

// ---------------------------------------------------------------------------
// POST /configurations — submit a finished configuration.
// ---------------------------------------------------------------------------
const submitSchema = selectionSchema.extend({
  contactName: z.string().trim().min(1).max(120),
  businessName: z.string().trim().max(160).optional(),
  phone: z.string().trim().min(4).max(40),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  businessType: z.string().max(60).optional(),
  notes: z.string().max(4000).optional(),
  // honeypot — bots fill hidden fields, humans never see them
  website: z.string().max(0).optional(),
});

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function nextConfigCode(tx: Tx): Promise<string> {
  const now = new Date();
  const prefix = `CFG-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-`;
  const rows = await tx.planConfiguration.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });
  let max = 0;
  for (const r of rows) {
    const n = parseInt(r.code.slice(prefix.length), 10);
    if (n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

router.post("/configurations", rateLimit(10, 60_000), async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Please check the form and try again." });
  }
  const d = parsed.data;
  if (d.website) return res.status(400).json({ error: "Invalid submission." });

  // Re-price server-side. Never trust a total that arrived from the browser.
  const cat = await loadCatalogue();
  const q = quote(cat, {
    planKey: d.planKey,
    coreSystem: d.coreSystem ?? null,
    capacities: d.capacities,
    addOnKeys: d.addOnKeys,
  });

  const blocking = q.issues.filter((i) => i.blocking);
  if (blocking.length) {
    return res.status(400).json({ error: blocking[0].message, issues: blocking });
  }

  const now = new Date();
  const planName = cat.plans.find((p) => p.key === q.planKey)?.name ?? q.planKey;

  const created = await prisma.$transaction(async (tx) => {
    const code = await nextConfigCode(tx);

    // Route to a salesperson so the request reaches someone, mirroring how
    // applications are assigned in public.ts.
    const salesperson = await tx.salesperson.findFirst({
      where: { status: "Active", deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, userId: true },
    });

    // A Lead requires a salesperson, so it is only created when one exists.
    // The configuration itself is never lost either way.
    let leadId: string | null = null;
    if (salesperson) {
      const lead = await tx.lead.create({
        data: {
          code: await nextLeadCode(tx, now),
          salespersonId: salesperson.id,
          businessName: d.businessName || d.contactName,
          contactPerson: d.contactName,
          phone: d.phone,
          email: d.email || null,
          category: d.businessType ?? null,
          source: "Website Inquiry",
          status: "New",
          interestedService: `${planName} plan${q.coreSystem ? ` (${q.coreSystem})` : ""}`,
          proposedMonthly: q.monthlyTotal,
          proposedSetup: q.oneTimeTotal || null,
          notes:
            `From Plan Builder configuration ${code}.\n` +
            `Estimated $${q.monthlyTotal}/month` +
            (q.oneTimeTotal ? ` + $${q.oneTimeTotal} one-time` : "") +
            (q.quoteItems.length ? `\nNeeds quotation: ${q.quoteItems.map((i) => i.label).join(", ")}` : "") +
            (d.notes ? `\n\n${d.notes}` : ""),
          nextFollowUpDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        },
        select: { id: true },
      });
      leadId = lead.id;

      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: "note",
          summary: `Plan configuration received (${code}) — ${planName}, $${q.monthlyTotal}/month`,
          createdBy: "website",
        },
      });

      if (salesperson.userId) {
        await tx.notification.create({
          data: {
            type: "newConfiguration",
            severity: "attention",
            entityType: "Lead",
            entityId: lead.id,
            userId: salesperson.userId,
            message: `New plan configuration: ${d.businessName || d.contactName} (${code}) — $${q.monthlyTotal}/month`,
          },
        });
      }
    }

    return tx.planConfiguration.create({
      data: {
        code,
        contactName: d.contactName,
        businessName: d.businessName ?? null,
        phone: d.phone,
        email: d.email || null,
        businessType: d.businessType ?? null,
        notes: d.notes ?? null,
        planKey: q.planKey,
        coreSystem: q.coreSystem,
        capacities: (d.capacities ?? {}) as any,
        selectedAddOns: [
          ...q.monthly.filter((l) => l.kind === "addon").map((l) => ({ key: l.key, name: l.label, pricingType: "monthly", price: l.amount })),
          ...q.oneTime.map((l) => ({ key: l.key, name: l.label, pricingType: "onetime", price: l.amount })),
          ...q.included.map((l) => ({ key: l.key, name: l.label, pricingType: "included", price: 0 })),
        ] as any,
        quoteItems: q.quoteItems.map((l) => ({ key: l.key, name: l.label })) as any,
        monthlyTotal: q.monthlyTotal,
        oneTimeTotal: q.oneTimeTotal,
        breakdown: q as any,
        salespersonId: salesperson?.id ?? null,
        leadId,
      },
      select: { code: true },
    });
  });

  res.status(201).json({
    reference: created.code,
    monthlyTotal: q.monthlyTotal,
    oneTimeTotal: q.oneTimeTotal,
    needsQuotation: q.quoteItems.length > 0,
  });
});

export default router;
