// ---------------------------------------------------------------------------
// Pricing in the browser.
//
// The Plan Builder needs a total that updates as fast as a customer clicks, so
// it runs the REAL engine (`server/src/lib/pricing.ts`, aliased to `@engine`)
// against the catalogue it already fetched. Not a copy of the rules — the same
// module the server prices with, so the two cannot disagree.
//
// The server is still the authority: POST /api/public/pricing/configurations
// re-prices every submission before storing it. What the customer sees here is
// an estimate that happens to be computed by the same code.
// ---------------------------------------------------------------------------

import { quote as engineQuote, type Catalogue as EngineCatalogue, type Quote, type Selection } from "@engine";
import type { Catalogue } from "./catalogue";

export type { Quote, Selection };
export type { CoreSystem, LineItem, Recommendation, ValidationIssue } from "@engine";

/**
 * The public payload flattens a plan's allowances into `included`; the engine
 * wants them at the top level. Everything else already lines up by name.
 */
export function toEngineCatalogue(cat: Catalogue): EngineCatalogue {
  return {
    plans: cat.plans.map((p) => ({
      key: p.key,
      name: p.name,
      basePrice: p.basePrice,
      priceIsFrom: p.priceIsFrom,
      coreSystemMode: p.coreSystemMode,
      bothSystemsPrice: p.bothSystemsPrice,
      includedSections: p.included.sections,
      includedUpdates: p.included.updates,
      includedProducts: p.included.products,
      includedServices: p.included.services,
      includedStaff: p.included.staff,
      includedLocations: p.included.locations,
      order: p.order,
    })),
    addOns: cat.addOns.map((a) => ({
      key: a.key,
      name: a.name,
      categoryKey: a.categoryKey,
      pricingType: a.pricingType,
      price: a.price,
      priceIsFrom: a.priceIsFrom,
      priceLabel: a.priceLabel,
      minPlan: a.minPlan,
      includedInPlans: a.includedInPlans,
      bundledWith: a.bundledWith,
      dependencies: a.dependencies,
    })),
    capacity: cat.capacity.map((c, i) => ({
      key: c.key,
      name: c.name,
      unitLabel: c.unitLabel,
      stepSize: c.stepSize,
      pricePerStep: c.pricePerStep,
      maxSteps: c.maxSteps,
      appliesToPlans: c.appliesToPlans,
      requiresCoreSystem: c.requiresCoreSystem,
      // The API already returns capacity in `order`; keep that sequence.
      order: i,
    })),
  };
}

export function priceSelection(cat: Catalogue, selection: Selection): Quote {
  return engineQuote(toEngineCatalogue(cat), selection);
}

/** The allowance a plan gives for one capacity dimension (null = unavailable). */
export function allowanceFor(cat: Catalogue, planKey: string, capacityKey: string): number | null {
  const p = cat.plans.find((x) => x.key === planKey);
  if (!p) return null;
  const map: Record<string, number | null> = {
    products: p.included.products,
    services: p.included.services,
    staff: p.included.staff,
    updates: p.included.updates,
    locations: p.included.locations,
    sections: p.included.sections,
  };
  return map[capacityKey] ?? null;
}

/**
 * The message a customer sends on WhatsApp. Built from the quote, so it says
 * exactly what the summary said — including what still needs a quotation.
 */
export function quoteMessage(cat: Catalogue, q: Quote): string {
  const planName = cat.plans.find((p) => p.key === q.planKey)?.name ?? q.planKey;
  const core =
    q.coreSystem === "booking" ? "booking system"
    : q.coreSystem === "store" ? "online store"
    : q.coreSystem === "both" ? "booking system and online store"
    : null;

  const lines = [
    `Hi IGNIS, I built a plan on your website:`,
    ``,
    `Plan: ${planName}${core ? ` (${core})` : ""}`,
  ];

  const paid = q.monthly.filter((l) => l.kind !== "plan");
  if (paid.length) {
    lines.push(`Monthly extras: ${paid.map((l) => `${l.label} $${l.amount}`).join(", ")}`);
  }
  if (q.oneTime.length) {
    lines.push(`One-time: ${q.oneTime.map((l) => `${l.label} $${l.amount}`).join(", ")}`);
  }
  if (q.quoteItems.length) {
    lines.push(`Needs a quotation: ${q.quoteItems.map((l) => l.label).join(", ")}`);
  }

  lines.push(``, `Estimated total: $${q.monthlyTotal}/month${q.oneTimeTotal ? ` + $${q.oneTimeTotal} one-time` : ""}`);
  return lines.join("\n");
}
