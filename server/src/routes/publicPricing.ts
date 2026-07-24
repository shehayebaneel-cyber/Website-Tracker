// ---------------------------------------------------------------------------
// PUBLIC, UNAUTHENTICATED pricing endpoints for the IGNIS website.
//
// Mounted under /api/public/pricing, before requireAuth.
//
//   GET  /catalogue      everything the pricing pages render from
//   POST /quote          server-authoritative price for a selection
//   POST /configurations submit a finished website configuration
//
// The public app computes a live estimate in the browser with the SAME engine
// for responsiveness, but /quote is the authority: the submitted configuration
// is always re-priced here before being stored, so a tampered or stale client
// can never book a price we never offered.
// ---------------------------------------------------------------------------

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { loadCatalogue } from "../lib/pricingCatalogue.js";
import { quote, maxStandardMonthly } from "../lib/pricing.js";
import { nextLeadCode } from "../lib/sales.js";

const router = Router();

// ---- naive in-memory rate limit (per IP), same shape as public.ts ----
// Each limiter keeps its OWN bucket: pricing a selection is cheap and frequent,
// submitting one is rare and expensive, so a burst of quotes must never use up
// a customer's ability to send their configuration.
function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
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
// GET /catalogue — one payload for the Pricing page, Feature Packs and Builder.
// ---------------------------------------------------------------------------
router.get("/catalogue", async (_req, res) => {
  const [
    base, systems, packs, oneTime, external,
    comparison, setups, faqs, terms, businessTypes, content,
  ] = await Promise.all([
    prisma.baseWebsite.findFirst({
      where: { active: true },
      include: { inclusions: { where: { active: true }, orderBy: { order: "asc" } } },
    }),
    prisma.coreSystem.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: {
        inclusions: { where: { active: true }, orderBy: { order: "asc" } },
        limits: { where: { active: true }, orderBy: { order: "asc" } },
      },
    }),
    prisma.featurePack.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: { features: { where: { active: true }, orderBy: { order: "asc" } } },
    }),
    prisma.oneTimeService.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.externalCost.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.comparisonRow.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.recommendedSetup.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.pricingFaq.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.pricingTerm.findMany({ where: { active: true }, orderBy: [{ kind: "asc" }, { order: "asc" }] }),
    prisma.businessType.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.pricingContent.findMany({ where: { active: true } }),
  ]);

  // The advertised maximum is DERIVED from the catalogue, never a stored number
  // that could fall out of step with the prices next to it.
  const cat = await loadCatalogue();

  res.json({
    base: base && {
      key: base.key,
      name: base.name,
      heading: base.heading,
      description: base.description,
      ctaLabel: base.ctaLabel,
      price: money(base.price),
      priceNote: base.priceNote,
      includedSections: base.includedSections,
      monthlyUpdates: base.monthlyUpdates,
      inclusions: base.inclusions.map((i) => i.label),
    },
    systems: systems.map((s) => ({
      key: s.key,
      name: s.name,
      shortName: s.shortName,
      heading: s.heading,
      description: s.description,
      ctaLabel: s.ctaLabel,
      price: money(s.price),
      icon: s.icon,
      order: s.order,
      inclusions: s.inclusions.map((i) => ({ label: i.label, group: i.group })),
      limits: s.limits.map((l) => ({
        key: l.key,
        label: l.label,
        unitLabel: l.unitLabel,
        baseValue: l.baseValue,
        upgradedValue: l.upgradedValue,
        helpText: l.helpText,
      })),
    })),
    packs: packs.map((p) => ({
      key: p.key,
      name: p.name,
      blurb: p.blurb,
      description: p.description,
      price: money(p.price),
      icon: p.icon,
      requiresSystems: p.requiresSystems,
      compatibleSystems: p.compatibleSystems,
      requiresReason: p.requiresReason,
      raisesLimits: p.raisesLimits,
      recommendedFor: p.recommendedFor,
      order: p.order,
      features: p.features.map((f) => ({ label: f.label, group: f.group })),
    })),
    oneTime: oneTime.map((o) => ({
      key: o.key,
      name: o.name,
      description: o.description,
      category: o.category,
      startingPrice: money(o.startingPrice),
      isQuote: o.isQuote,
    })),
    external: external.map((e) => ({
      key: e.key,
      name: e.name,
      description: e.description,
      provider: e.provider,
      costType: e.costType,
    })),
    comparison: comparison.map((r) => ({
      label: r.label,
      informational: r.informational,
      booking: r.booking,
      store: r.store,
      both: r.both,
      note: r.note,
    })),
    setups: setups.map((s) => ({
      key: s.key,
      name: s.name,
      description: s.description,
      systemKeys: s.systemKeys,
      packKeys: s.packKeys,
      icon: s.icon,
    })),
    faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
    glossary: terms.filter((t) => t.kind === "glossary").map((t) => ({ title: t.title, body: t.body })),
    terms: terms.filter((t) => t.kind === "term").map((t) => t.body),
    businessTypes: businessTypes.map((b) => ({
      key: b.key,
      name: b.name,
      icon: b.icon,
      recommendedSystems: b.recommendedSystems,
      priorityPacks: b.priorityPacks,
    })),
    content: Object.fromEntries(content.map((c) => [c.key, c.value])),
    maxStandardMonthly: maxStandardMonthly(cat),
  });
});

// ---------------------------------------------------------------------------
// POST /quote — price a selection.
// ---------------------------------------------------------------------------
const selectionSchema = z.object({
  systemKeys: z.array(z.string()).max(10).optional(),
  packKeys: z.array(z.string()).max(30).optional(),
  oneTimeKeys: z.array(z.string()).max(40).optional(),
  externalKeys: z.array(z.string()).max(40).optional(),
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
  contactMethod: z.string().max(40).optional(),
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

/** "Booking and E-commerce Website" — how the customer described what they want. */
function websiteTypeLabel(systemNames: string[]): string {
  if (!systemNames.length) return "Informational Website";
  return `${systemNames.join(" and ")} Website`;
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
    systemKeys: d.systemKeys,
    packKeys: d.packKeys,
    oneTimeKeys: d.oneTimeKeys,
    externalKeys: d.externalKeys,
  });

  // An unmet requirement is a configuration we could not actually build.
  const blocking = [
    ...q.unmet.filter((u) => u.blocking).map((u) => u.message),
    ...q.issues.filter((i) => i.blocking).map((i) => i.message),
  ];
  if (blocking.length) {
    return res.status(400).json({ error: blocking[0], issues: blocking });
  }

  const now = new Date();
  const systemNames = q.systemKeys.map(
    (k) => cat.systems.find((s) => s.key === k)?.shortName ?? k
  );
  const typeLabel = websiteTypeLabel(systemNames);
  const packNames = q.packKeys.map((k) => cat.packs.find((p) => p.key === k)?.name ?? k);

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
          interestedService: typeLabel,
          proposedMonthly: q.monthlyTotal,
          proposedSetup: q.oneTimeTotal || null,
          notes:
            `From website configuration ${code}.\n` +
            `${typeLabel} — $${q.monthlyTotal}/month` +
            (packNames.length ? `\nFeature packs: ${packNames.join(", ")}` : "") +
            (q.oneTime.length ? `\nOne-time: ${q.oneTime.map((l) => l.label).join(", ")}` : "") +
            (q.oneTimeNeedsQuote ? `\nSome one-time work needs a quotation.` : "") +
            (d.contactMethod ? `\nPrefers: ${d.contactMethod}` : "") +
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
          summary: `Website configuration received (${code}) — ${typeLabel}, $${q.monthlyTotal}/month`,
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
            message: `New website configuration: ${d.businessName || d.contactName} (${code}) — $${q.monthlyTotal}/month`,
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

        systemKeys: q.systemKeys,
        packKeys: q.packKeys,
        oneTimeKeys: q.oneTime.map((l) => l.key),
        externalKeys: q.external.map((l) => l.key),

        // Snapshot of exactly what was charged, in the customer's words.
        selectedAddOns: q.monthly.map((l) => ({
          key: l.key,
          name: l.label,
          kind: l.kind,
          price: l.amount,
        })) as any,
        quoteItems: q.oneTime
          .filter((l) => l.isQuote)
          .map((l) => ({ key: l.key, name: l.label })) as any,

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
    websiteType: typeLabel,
    monthlyTotal: q.monthlyTotal,
    oneTimeTotal: q.oneTimeTotal,
    needsQuotation: q.oneTimeNeedsQuote,
  });
});

export default router;
