// ---------------------------------------------------------------------------
// Loads the pricing catalogue out of the database and into the plain shapes the
// engine (pricing.ts) works with. Prisma Decimals become numbers here, at the
// boundary, exactly as calc.ts does for money elsewhere.
// ---------------------------------------------------------------------------

import { prisma } from "./db.js";
import type { Catalogue, AddOnDef, PricingPlanDef, CapacityDef } from "./pricing.js";

const num = (d: unknown): number => (d == null ? 0 : Number(d));
const numOrNull = (d: unknown): number | null => (d == null ? null : Number(d));

export async function loadCatalogue(): Promise<Catalogue> {
  const [plans, addOns, capacity] = await Promise.all([
    prisma.pricingPlan.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.addOn.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: { dependencies: true, category: true },
    }),
    prisma.capacityUpgrade.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);

  return {
    plans: plans.map<PricingPlanDef>((p) => ({
      key: p.key,
      name: p.name,
      basePrice: num(p.basePrice),
      priceIsFrom: p.priceIsFrom,
      coreSystemMode: p.coreSystemMode as PricingPlanDef["coreSystemMode"],
      bothSystemsPrice: numOrNull(p.bothSystemsPrice),
      includedSections: p.includedSections,
      includedUpdates: p.includedUpdates,
      includedProducts: p.includedProducts,
      includedServices: p.includedServices,
      includedStaff: p.includedStaff,
      includedLocations: p.includedLocations,
      order: p.order,
    })),
    addOns: addOns.map<AddOnDef>((a) => ({
      key: a.key,
      name: a.name,
      categoryKey: a.category.key,
      pricingType: a.pricingType as AddOnDef["pricingType"],
      price: numOrNull(a.price),
      priceIsFrom: a.priceIsFrom,
      priceLabel: a.priceLabel,
      minPlan: a.minPlan,
      includedInPlans: a.includedInPlans,
      bundledWith: a.bundledWith,
      dependencies: a.dependencies.map((d) => ({
        requiresType: d.requiresType as "addon" | "coreSystem",
        requiresKey: d.requiresKey,
        note: d.note,
      })),
    })),
    capacity: capacity.map<CapacityDef>((c) => ({
      key: c.key,
      name: c.name,
      unitLabel: c.unitLabel,
      stepSize: c.stepSize,
      pricePerStep: num(c.pricePerStep),
      maxSteps: c.maxSteps,
      appliesToPlans: c.appliesToPlans,
      requiresCoreSystem: c.requiresCoreSystem,
      order: c.order,
    })),
  };
}
