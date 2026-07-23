// ---------------------------------------------------------------------------
// Seeds the pricing catalogue from pricingData.ts.
//
// Idempotent and NON-DESTRUCTIVE by design: keyed records are upserted, and
// records the admin can freely edit (inclusions, comparison rows, FAQs, terms)
// are only created when they don't exist yet. Re-running never overwrites a
// price or wording changed in the admin console.
//
// To deliberately reset everything back to these defaults:
//   PRICING_RESEED=true npm run db:seed:pricing
// ---------------------------------------------------------------------------

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  PLANS, CATEGORIES, ADDONS, CAPACITY, COMPARISON,
  BUSINESS_TYPES, GLOSSARY, TERMS, EXTERNAL_COSTS, FAQS,
} from "./pricingData.js";

const prisma = new PrismaClient();
const RESEED = process.env.PRICING_RESEED === "true";

export async function seedPricing(db: PrismaClient = prisma) {
  console.log("\n— Pricing catalogue —");

  if (RESEED) {
    console.log("  PRICING_RESEED=true → clearing existing catalogue");
    await db.addOnDependency.deleteMany({});
    await db.addOn.deleteMany({});
    await db.addOnCategory.deleteMany({});
    await db.planInclusion.deleteMany({});
    await db.pricingPlan.deleteMany({});
    await db.capacityUpgrade.deleteMany({});
    await db.comparisonRow.deleteMany({});
    await db.pricingFaq.deleteMany({});
    await db.pricingTerm.deleteMany({});
    await db.businessType.deleteMany({});
  }

  // --- plans + inclusions ----------------------------------------------------
  for (const p of PLANS) {
    const { inclusions, ...plan } = p;
    const row = await db.pricingPlan.upsert({
      where: { key: p.key },
      update: {}, // never overwrite admin edits to an existing plan
      create: plan,
    });
    const existing = await db.planInclusion.count({ where: { planId: row.id } });
    if (existing === 0) {
      await db.planInclusion.createMany({
        data: inclusions.map(([label, coreSystem], i) => ({
          planId: row.id, label, coreSystem, order: i,
        })),
      });
    }
  }
  console.log(`  ${PLANS.length} plans`);

  // --- categories ------------------------------------------------------------
  const catId = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await db.addOnCategory.upsert({
      where: { key: c.key }, update: {}, create: c,
    });
    catId.set(c.key, row.id);
  }
  console.log(`  ${CATEGORIES.length} categories`);

  // --- add-ons + dependencies -----------------------------------------------
  for (const a of ADDONS) {
    const categoryId = catId.get(a.category);
    if (!categoryId) throw new Error(`Add-on "${a.key}" references unknown category "${a.category}"`);

    const row = await db.addOn.upsert({
      where: { key: a.key },
      update: {},
      create: {
        key: a.key,
        categoryId,
        name: a.name,
        blurb: a.blurb,
        bestFor: a.bestFor ?? null,
        includes: a.includes,
        pricingType: a.pricingType,
        price: a.price ?? null,
        priceLabel: a.priceLabel ?? null,
        minPlan: a.minPlan,
        includedInPlans: a.includedInPlans ?? [],
        bundledWith: a.bundledWith ?? null,
        recommendedFor: a.recommendedFor ?? [],
        popular: a.popular ?? false,
        order: a.order,
      },
    });

    const depCount = await db.addOnDependency.count({ where: { addOnId: row.id } });
    if (depCount === 0 && a.deps?.length) {
      await db.addOnDependency.createMany({
        data: a.deps.map(([requiresType, requiresKey, note]) => ({
          addOnId: row.id, requiresType, requiresKey, note: note ?? null,
        })),
      });
    }
  }
  console.log(`  ${ADDONS.length} add-ons`);

  // --- capacity upgrades -----------------------------------------------------
  for (const c of CAPACITY) {
    await db.capacityUpgrade.upsert({ where: { key: c.key }, update: {}, create: c });
  }
  console.log(`  ${CAPACITY.length} capacity upgrades`);

  // --- business types --------------------------------------------------------
  for (const b of BUSINESS_TYPES) {
    await db.businessType.upsert({ where: { key: b.key }, update: {}, create: b });
  }
  console.log(`  ${BUSINESS_TYPES.length} business types`);

  // --- editable content: only when empty ------------------------------------
  if ((await db.comparisonRow.count()) === 0) {
    await db.comparisonRow.createMany({ data: COMPARISON });
    console.log(`  ${COMPARISON.length} comparison rows`);
  }

  if ((await db.pricingFaq.count()) === 0) {
    await db.pricingFaq.createMany({
      data: FAQS.map((f, i) => ({ question: f.q, answer: f.a, order: i })),
    });
    console.log(`  ${FAQS.length} FAQs`);
  }

  if ((await db.pricingTerm.count()) === 0) {
    await db.pricingTerm.createMany({
      data: [
        ...GLOSSARY.map((g, i) => ({ kind: "glossary", title: g.title, body: g.body, order: i })),
        ...TERMS.map((t, i) => ({ kind: "term", title: null, body: t, order: i })),
        ...EXTERNAL_COSTS.map((t, i) => ({ kind: "external", title: null, body: t, order: i })),
      ],
    });
    console.log(`  ${GLOSSARY.length} glossary · ${TERMS.length} terms · ${EXTERNAL_COSTS.length} external costs`);
  }
}

// Allow running standalone: `npm run db:seed:pricing`
const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("seedPricing.ts");
if (isMain) {
  seedPricing()
    .then(async () => {
      await prisma.$disconnect();
      console.log("\nPricing seed complete.");
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
