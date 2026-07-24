// ---------------------------------------------------------------------------
// Seeds the pricing catalogue from pricingData.ts.
//
// Idempotent and NON-DESTRUCTIVE by design: keyed records are upserted with an
// empty `update`, and the child rows of a record (inclusions, limits, pack
// features) are only created when that record has none. Re-running never
// overwrites a price or wording changed in the admin console.
//
// To deliberately reset everything back to these defaults:
//   PRICING_RESEED=true npm run db:seed:pricing
// ---------------------------------------------------------------------------

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  BASE, SYSTEMS, PACKS, ONE_TIME, EXTERNAL_COSTS, COMPARISON,
  SETUPS, BUSINESS_TYPES, GLOSSARY, TERMS, FAQS, CONTENT,
} from "./pricingData.js";

const prisma = new PrismaClient();
const RESEED = process.env.PRICING_RESEED === "true";
/**
 * Set by the production start command. Fills a catalogue that was never
 * seeded (a migrated-but-empty database serves a website with no prices), and
 * does nothing at all once one exists — so boots stay fast, and adding a
 * default to pricingData.ts never puts a new priced item in front of customers
 * as a side effect of a deploy. Run the seed deliberately for that.
 */
const ONLY_IF_EMPTY = process.env.PRICING_SEED_IF_EMPTY === "true";

export async function seedPricing(db: PrismaClient = prisma) {
  console.log("\n— Pricing catalogue —");

  if (ONLY_IF_EMPTY && !RESEED) {
    const existing = await db.coreSystem.count();
    if (existing > 0) {
      console.log(`  ${existing} core systems already present → nothing to do`);
      return;
    }
    console.log("  catalogue is empty → seeding defaults");
  }

  if (RESEED) {
    console.log("  PRICING_RESEED=true → clearing existing catalogue");
    await db.packFeature.deleteMany({});
    await db.featurePack.deleteMany({});
    await db.systemLimit.deleteMany({});
    await db.systemInclusion.deleteMany({});
    await db.coreSystem.deleteMany({});
    await db.baseInclusion.deleteMany({});
    await db.baseWebsite.deleteMany({});
    await db.oneTimeService.deleteMany({});
    await db.externalCost.deleteMany({});
    await db.comparisonRow.deleteMany({});
    await db.recommendedSetup.deleteMany({});
    await db.pricingFaq.deleteMany({});
    await db.pricingTerm.deleteMany({});
    await db.pricingContent.deleteMany({});
    await db.businessType.deleteMany({});
  }

  // --- base website ----------------------------------------------------------
  {
    const { inclusions, ...base } = BASE;
    const row = await db.baseWebsite.upsert({
      where: { key: base.key },
      update: {}, // never overwrite admin edits
      create: base,
    });
    if ((await db.baseInclusion.count({ where: { baseId: row.id } })) === 0) {
      await db.baseInclusion.createMany({
        data: inclusions.map((label, order) => ({ baseId: row.id, label, order })),
      });
    }
    console.log(`  base website $${base.price} · ${inclusions.length} inclusions`);
  }

  // --- core systems ----------------------------------------------------------
  for (const s of SYSTEMS) {
    const { inclusions, limits, ...system } = s;
    const row = await db.coreSystem.upsert({
      where: { key: s.key },
      update: {},
      create: system,
    });
    if ((await db.systemInclusion.count({ where: { systemId: row.id } })) === 0) {
      await db.systemInclusion.createMany({
        data: inclusions.map((label, order) => ({ systemId: row.id, label, order })),
      });
    }
    for (const [order, l] of limits.entries()) {
      await db.systemLimit.upsert({
        where: { systemId_key: { systemId: row.id, key: l.key } },
        update: {},
        create: { ...l, systemId: row.id, order },
      });
    }
  }
  console.log(`  ${SYSTEMS.length} core systems`);

  // --- feature packs ---------------------------------------------------------
  for (const p of PACKS) {
    const { features, ...pack } = p;
    const row = await db.featurePack.upsert({
      where: { key: p.key },
      update: {},
      create: pack,
    });
    if ((await db.packFeature.count({ where: { packId: row.id } })) === 0) {
      await db.packFeature.createMany({
        data: features.map((label, order) => ({ packId: row.id, label, order })),
      });
    }
  }
  console.log(`  ${PACKS.length} feature packs`);

  // --- one-time services and external costs ----------------------------------
  for (const o of ONE_TIME) {
    await db.oneTimeService.upsert({ where: { key: o.key }, update: {}, create: o });
  }
  for (const e of EXTERNAL_COSTS) {
    await db.externalCost.upsert({ where: { key: e.key }, update: {}, create: e });
  }
  console.log(`  ${ONE_TIME.length} one-time services · ${EXTERNAL_COSTS.length} external costs`);

  // --- recommended setups and business types ---------------------------------
  for (const s of SETUPS) {
    await db.recommendedSetup.upsert({ where: { key: s.key }, update: {}, create: s });
  }
  for (const b of BUSINESS_TYPES) {
    await db.businessType.upsert({ where: { key: b.key }, update: {}, create: b });
  }
  for (const c of CONTENT) {
    await db.pricingContent.upsert({ where: { key: c.key }, update: {}, create: c });
  }
  console.log(`  ${SETUPS.length} example setups · ${BUSINESS_TYPES.length} business types · ${CONTENT.length} content keys`);

  // --- editable content: only when empty -------------------------------------
  if ((await db.comparisonRow.count()) === 0) {
    await db.comparisonRow.createMany({ data: COMPARISON });
    console.log(`  ${COMPARISON.length} comparison rows`);
  }

  if ((await db.pricingFaq.count()) === 0) {
    await db.pricingFaq.createMany({
      data: FAQS.map((f, i) => ({ question: f.question, answer: f.answer, order: i })),
    });
    console.log(`  ${FAQS.length} FAQs`);
  }

  if ((await db.pricingTerm.count()) === 0) {
    await db.pricingTerm.createMany({
      data: [
        ...GLOSSARY.map((g, i) => ({ kind: "glossary", title: g.title, body: g.body, order: i })),
        ...TERMS.map((t, i) => ({ kind: "term", title: null, body: t, order: i })),
      ],
    });
    console.log(`  ${GLOSSARY.length} glossary · ${TERMS.length} terms`);
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
