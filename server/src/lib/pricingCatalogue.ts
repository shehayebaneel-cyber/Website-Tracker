// ---------------------------------------------------------------------------
// Loads the pricing catalogue out of the database and into the plain shapes the
// engine (pricing.ts) works with. Prisma Decimals become numbers here, at the
// boundary, exactly as calc.ts does for money elsewhere.
// ---------------------------------------------------------------------------

import { prisma } from "./db.js";
import type { Catalogue } from "./pricing.js";

const num = (d: unknown): number => (d == null ? 0 : Number(d));
const numOrNull = (d: unknown): number | null => (d == null ? null : Number(d));

export async function loadCatalogue(): Promise<Catalogue> {
  const [base, systems, packs, oneTime, external] = await Promise.all([
    prisma.baseWebsite.findFirst({ where: { active: true } }),
    prisma.coreSystem.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: { limits: { where: { active: true }, orderBy: { order: "asc" } } },
    }),
    prisma.featurePack.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.oneTimeService.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.externalCost.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);

  return {
    // A catalogue with no base website cannot price anything. Callers check for
    // that rather than treating a missing base as free.
    base: base
      ? {
          key: base.key,
          name: base.name,
          price: num(base.price),
          includedSections: base.includedSections,
          monthlyUpdates: base.monthlyUpdates,
        }
      : { key: "base", name: "Base website", price: 0, includedSections: 0, monthlyUpdates: 0 },

    systems: systems.map((s) => ({
      key: s.key,
      name: s.name,
      shortName: s.shortName,
      price: num(s.price),
      order: s.order,
      limits: s.limits.map((l) => ({
        key: l.key,
        label: l.label,
        unitLabel: l.unitLabel,
        baseValue: l.baseValue,
        upgradedValue: l.upgradedValue,
      })),
    })),

    packs: packs.map((p) => ({
      key: p.key,
      name: p.name,
      price: num(p.price),
      requiresSystems: p.requiresSystems,
      compatibleSystems: p.compatibleSystems,
      requiresReason: p.requiresReason,
      raisesLimits: p.raisesLimits,
      order: p.order,
    })),

    oneTime: oneTime.map((o) => ({
      key: o.key,
      name: o.name,
      startingPrice: numOrNull(o.startingPrice),
      isQuote: o.isQuote,
    })),

    external: external.map((e) => ({
      key: e.key,
      name: e.name,
      provider: e.provider,
      costType: e.costType,
    })),
  };
}
