// ---------------------------------------------------------------------------
// The pricing catalogue, as served by GET /api/public/pricing/catalogue.
//
// Every price, limit and eligibility rule the public site shows comes from
// here — the database is the single source of truth. Nothing in public/ may
// hardcode a price, a plan limit or an "included with" rule.
//
// The payload is small and identical for every visitor, so it is fetched once
// per page load and shared by every component that needs it.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { api } from "./api";

export type CoreSystem = "booking" | "store" | "both";
export type PricingType = "monthly" | "onetime" | "quote" | "external" | "bundled";
export type CoreSystemMode = "none" | "choose-one" | "one-included-both-available";

export interface PlanInclusion {
  label: string;
  /** null = applies to the whole plan; "booking"/"store" = only that variant. */
  coreSystem: string | null;
}

export interface CataloguePlan {
  key: string;
  name: string;
  heading: string;
  description: string;
  bestFor: string | null;
  basePrice: number;
  priceIsFrom: boolean;
  priceNote: string;
  ctaLabel: string;
  addOnHint: string | null;
  coreSystemMode: CoreSystemMode;
  bothSystemsPrice: number | null;
  included: {
    sections: number | null;
    updates: number;
    products: number | null;
    services: number | null;
    staff: number | null;
    locations: number;
  };
  popular: boolean;
  order: number;
  inclusions: PlanInclusion[];
}

export interface CatalogueCategory {
  key: string;
  name: string;
  blurb: string | null;
  icon: string | null;
}

export interface CatalogueDependency {
  requiresType: "addon" | "coreSystem";
  requiresKey: string;
  note: string | null;
}

export interface CatalogueAddOn {
  key: string;
  categoryKey: string;
  name: string;
  blurb: string | null;
  bestFor: string | null;
  icon: string | null;
  includes: string[];
  pricingType: PricingType;
  price: number | null;
  priceIsFrom: boolean;
  priceLabel: string | null;
  minPlan: string;
  includedInPlans: string[];
  bundledWith: string | null;
  recommendedFor: string[];
  popular: boolean;
  dependencies: CatalogueDependency[];
}

export interface CatalogueCapacity {
  key: string;
  name: string;
  unitLabel: string;
  stepSize: number;
  pricePerStep: number;
  maxSteps: number | null;
  appliesToPlans: string[];
  requiresCoreSystem: string | null;
  helpText: string | null;
}

export interface ComparisonRow {
  label: string;
  basic: string;
  standard: string;
  premium: string;
  note: string | null;
}

export interface BusinessType {
  key: string;
  name: string;
  icon: string | null;
  recommendedPlan: string;
  recommendedCore: string | null;
  priorityCategories: string[];
  priorityAddOns: string[];
}

export interface Catalogue {
  plans: CataloguePlan[];
  categories: CatalogueCategory[];
  addOns: CatalogueAddOn[];
  capacity: CatalogueCapacity[];
  comparison: ComparisonRow[];
  faqs: { question: string; answer: string }[];
  glossary: { title: string; body: string }[];
  terms: string[];
  externalCosts: string[];
  businessTypes: BusinessType[];
}

// One request per page load, shared by every caller.
let pending: Promise<Catalogue> | null = null;

export function loadCatalogue(): Promise<Catalogue> {
  if (!pending) {
    pending = api.get<Catalogue>("/public/pricing/catalogue").catch((e) => {
      pending = null; // let a later mount retry
      throw e;
    });
  }
  return pending;
}

export function useCatalogue() {
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    loadCatalogue()
      .then((c) => {
        if (!live) return;
        // A reachable API with an empty catalogue is still nothing to price
        // from — e.g. a database that has the tables but was never seeded.
        // Say so, rather than rendering a pricing page with no prices in it.
        if (!c.plans.length) {
          setError("Our plans could not be loaded right now.");
          return;
        }
        setCatalogue(c);
      })
      .catch(() => live && setError("Our plans could not be loaded right now."));
    return () => {
      live = false;
    };
  }, []);

  return { catalogue, error, loading: !catalogue && !error };
}

// ---- display helpers -------------------------------------------------------

/** $10 · From $30 — never rounds a price the customer will be charged. */
export function priceLabel(amount: number, isFrom?: boolean): string {
  const n = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${isFrom ? "From " : ""}$${n}`;
}

/** What an add-on costs, in the words the catalogue chose. */
export function addOnPrice(a: CatalogueAddOn): string {
  if (a.priceLabel) return a.priceLabel;
  if (a.pricingType === "quote") return "By quotation";
  if (a.pricingType === "external") return "Paid to the provider";
  if (a.pricingType === "bundled") return "Included";
  if (a.price == null) return "By quotation";
  const base = priceLabel(a.price, a.priceIsFrom);
  return a.pricingType === "onetime" ? `${base} one-time` : `${base}/month`;
}

/** A plan's customer-facing name, or its key if it has been retired. */
export function planName(cat: Catalogue, key: string): string {
  return cat.plans.find((p) => p.key === key)?.name ?? key;
}

/** The lowest plan in the catalogue — an add-on requiring it needs no badge. */
export function lowestPlanKey(cat: Catalogue): string | undefined {
  return [...cat.plans].sort((a, b) => a.order - b.order)[0]?.key;
}

export type BadgeTone = "popular" | "included" | "plan" | "needs";
export interface AddOnBadge {
  label: string;
  tone: BadgeTone;
}

/**
 * Everything a customer must know before choosing an add-on: which plan it
 * needs, what it already comes with, and what else it depends on. Built here
 * so the catalogue page, the Plan Builder and the summary all say the same
 * thing — the rules themselves live in the database.
 */
export function addOnBadges(cat: Catalogue, a: CatalogueAddOn): AddOnBadge[] {
  const badges: AddOnBadge[] = [];
  const byKey = new Map(cat.addOns.map((x) => [x.key, x]));

  if (a.popular) badges.push({ label: "Popular", tone: "popular" });

  // A bundled feature is never bought — it arrives with its parent, or, when it
  // has no parent, with the plan itself. Either way the plan badge would only
  // repeat what this already says.
  const bundled = a.pricingType === "bundled";
  if (bundled) {
    const parent = a.bundledWith ? byKey.get(a.bundledWith)?.name : null;
    badges.push({
      label: parent ? `Comes with ${parent}` : `Comes with ${planName(cat, a.minPlan)} and above`,
      tone: "included",
    });
  }

  if (a.includedInPlans.length) {
    badges.push({
      label: `Included with ${a.includedInPlans.map((k) => planName(cat, k)).join(" and ")}`,
      tone: "included",
    });
  }

  // "Standard or above" is only worth saying when it rules a plan out.
  if (!bundled && a.minPlan !== lowestPlanKey(cat) && !a.includedInPlans.includes(a.minPlan)) {
    badges.push({ label: `${planName(cat, a.minPlan)} or above`, tone: "plan" });
  }

  for (const d of a.dependencies) {
    if (d.note) badges.push({ label: d.note, tone: "needs" });
    else if (d.requiresType === "coreSystem") {
      badges.push({ label: `Needs ${coreRequirementLabel(d.requiresKey)}`, tone: "needs" });
    } else {
      badges.push({ label: `Needs ${byKey.get(d.requiresKey)?.name ?? d.requiresKey}`, tone: "needs" });
    }
  }

  return badges;
}

/**
 * "store" → "an online store or ordering system"
 * "booking|store" → "a booking system or an online store" (the short form, so
 * a two-part requirement doesn't read as three "or"s).
 */
export function coreRequirementLabel(requiresKey: string): string {
  const parts = requiresKey.split("|");
  const label = (k: string) =>
    k === "booking"
      ? "a booking system"
      : parts.length > 1
      ? "an online store"
      : "an online store or ordering system";
  return parts.map(label).join(" or ");
}

/** Sub-features that ship inside an add-on rather than being bought separately. */
export function bundledInto(cat: Catalogue, key: string): CatalogueAddOn[] {
  return cat.addOns.filter((a) => a.pricingType === "bundled" && a.bundledWith === key);
}

/** Inclusions for one variant of a plan: the shared ones plus that core's. */
export function inclusionsFor(plan: CataloguePlan, core: string | null): string[] {
  return plan.inclusions
    .filter((i) => i.coreSystem == null || i.coreSystem === core)
    .map((i) => i.label);
}

/** The core systems a plan's inclusion list actually distinguishes. */
export function coreVariants(plan: CataloguePlan): string[] {
  const seen: string[] = [];
  for (const i of plan.inclusions) {
    if (i.coreSystem && !seen.includes(i.coreSystem)) seen.push(i.coreSystem);
  }
  return seen;
}

export const coreSystemName = (key: string): string =>
  key === "booking" ? "Booking system" : key === "store" ? "Online store" : key;
