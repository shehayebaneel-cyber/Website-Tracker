// ---------------------------------------------------------------------------
// The pricing catalogue, as served by GET /api/public/pricing/catalogue.
//
// Every price, limit, inclusion, eligibility rule and piece of pricing copy the
// public site shows comes from here — the database is the single source of
// truth. Nothing in public/ may hardcode a price, a limit, a rule or a heading.
//
// The payload is small and identical for every visitor, so it is fetched once
// per page load and shared by every component that needs it.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { api } from "./api";

export interface BaseWebsite {
  key: string;
  name: string;
  heading: string;
  description: string;
  ctaLabel: string;
  price: number;
  priceNote: string;
  includedSections: number;
  monthlyUpdates: number;
  inclusions: string[];
}

export interface SystemLimit {
  key: string;
  label: string;
  unitLabel: string;
  baseValue: number;
  upgradedValue: number;
  helpText: string | null;
}

export interface CoreSystem {
  key: string; // booking | store
  name: string;
  shortName: string;
  heading: string;
  description: string;
  ctaLabel: string;
  price: number;
  icon: string | null;
  order: number;
  inclusions: { label: string; group: string | null }[];
  limits: SystemLimit[];
}

export interface FeaturePack {
  key: string;
  name: string;
  blurb: string;
  description: string;
  price: number;
  icon: string | null;
  /** Systems the pack cannot work without. Empty = any system will do. */
  requiresSystems: string[];
  compatibleSystems: string[];
  requiresReason: string | null;
  raisesLimits: boolean;
  recommendedFor: string[];
  order: number;
  features: { label: string; group: string | null }[];
}

export interface OneTimeService {
  key: string;
  name: string;
  description: string | null;
  category: string; // website | content | data | custom
  startingPrice: number | null;
  isQuote: boolean;
}

export interface ExternalCost {
  key: string;
  name: string;
  description: string | null;
  provider: string | null;
  costType: string; // fixed | estimated | usage
}

export interface ComparisonRow {
  label: string;
  informational: string;
  booking: string;
  store: string;
  both: string;
  note: string | null;
}

export interface RecommendedSetup {
  key: string;
  name: string;
  description: string | null;
  systemKeys: string[];
  packKeys: string[];
  icon: string | null;
}

export interface BusinessType {
  key: string;
  name: string;
  icon: string | null;
  recommendedSystems: string[];
  priorityPacks: string[];
}

export interface Catalogue {
  base: BaseWebsite | null;
  systems: CoreSystem[];
  packs: FeaturePack[];
  oneTime: OneTimeService[];
  external: ExternalCost[];
  comparison: ComparisonRow[];
  setups: RecommendedSetup[];
  faqs: { question: string; answer: string }[];
  glossary: { title: string; body: string }[];
  terms: string[];
  businessTypes: BusinessType[];
  /** Editable copy, keyed. Never hold a heading in the app. */
  content: Record<string, string>;
  maxStandardMonthly: number;
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
        // A reachable API with no base website is nothing we can price from —
        // e.g. a database that has the tables but was never seeded. Say so
        // rather than rendering a pricing page with no prices in it.
        if (!c.base || !c.systems.length) {
          setError("Our pricing could not be loaded right now.");
          return;
        }
        setCatalogue(c);
      })
      .catch(() => live && setError("Our pricing could not be loaded right now."));
    return () => {
      live = false;
    };
  }, []);

  return { catalogue, error, loading: !catalogue && !error };
}

// ---- display helpers -------------------------------------------------------

/** $10 · +$5 — never rounds a price the customer will be charged. */
export function priceLabel(amount: number, plus?: boolean): string {
  const n = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${plus ? "+" : ""}$${n}`;
}

/** What a one-time service costs, or that it has to be quoted. */
export function oneTimePrice(s: OneTimeService): string {
  if (s.isQuote || s.startingPrice == null) return "Requires quotation";
  return `From ${priceLabel(s.startingPrice)} one-time`;
}

/** Copy from the database, with a safe fallback if a key was removed. */
export function text(cat: Catalogue | null, key: string, fallback = ""): string {
  return cat?.content[key] ?? fallback;
}

/** "Booking and E-commerce Website" — how a set of systems is named. */
export function websiteTypeName(cat: Catalogue, systemKeys: string[]): string {
  if (!systemKeys.length) return "Informational Website";
  const names = cat.systems
    .filter((s) => systemKeys.includes(s.key))
    .sort((a, b) => a.order - b.order)
    .map((s) => s.shortName);
  return `${names.join(" and ")} Website`;
}

/** The four starting options on the Pricing page, priced from the catalogue. */
export interface StartingOption {
  key: string;
  systemKeys: string[];
  name: string;
  description: string;
  ctaLabel: string;
  price: number;
  icon: string | null;
}

export function startingOptions(cat: Catalogue): StartingOption[] {
  const base = cat.base!;
  const systems = [...cat.systems].sort((a, b) => a.order - b.order);
  const options: StartingOption[] = [
    {
      key: "informational",
      systemKeys: [],
      name: "Informational Website",
      description: base.description,
      ctaLabel: base.ctaLabel,
      price: base.price,
      icon: "globe",
    },
  ];

  for (const s of systems) {
    options.push({
      key: s.key,
      systemKeys: [s.key],
      name: `${s.shortName} Website`,
      description: s.description,
      ctaLabel: s.ctaLabel,
      price: base.price + s.price,
      icon: s.icon,
    });
  }

  if (systems.length > 1) {
    const all = systems.map((s) => s.key);
    options.push({
      key: "both",
      systemKeys: all,
      name: systems.map((s) => s.shortName).join(" and "),
      description:
        "Everything in both systems, managed from one dashboard with a single login.",
      ctaLabel: "Build Both Systems",
      price: base.price + systems.reduce((sum, s) => sum + s.price, 0),
      icon: "sparkle",
    });
  }

  return options;
}

/** The systems a pack would need added, given what is currently selected. */
export function missingSystemsFor(
  cat: Catalogue,
  pack: FeaturePack,
  systemKeys: string[]
): CoreSystem[] {
  if (packIsUsable(pack, systemKeys)) return [];
  const wanted = pack.requiresSystems.length
    ? pack.requiresSystems
    : cat.systems.map((s) => s.key);
  return cat.systems.filter((s) => wanted.includes(s.key) && !systemKeys.includes(s.key));
}

/**
 * Mirrors the engine's `packIsAvailable`. Kept here too so a card can be
 * rendered as unavailable without pricing a whole quote for it.
 */
export function packIsUsable(pack: FeaturePack, systemKeys: string[]): boolean {
  if (systemKeys.length === 0) return false;
  if (pack.requiresSystems.length && !pack.requiresSystems.some((k) => systemKeys.includes(k))) {
    return false;
  }
  if (pack.compatibleSystems.length && !systemKeys.some((k) => pack.compatibleSystems.includes(k))) {
    return false;
  }
  return true;
}

/** How a pack's compatibility reads on a card: "Available with E-commerce". */
export function compatibilityLabel(cat: Catalogue, pack: FeaturePack): string {
  const names = (keys: string[]) =>
    cat.systems.filter((s) => keys.includes(s.key)).map((s) => s.shortName);

  if (pack.requiresSystems.length) {
    return `Requires ${names(pack.requiresSystems).join(" or ")}`;
  }
  if (pack.compatibleSystems.length) {
    return `Available with ${names(pack.compatibleSystems).join(" or ")}`;
  }
  return `Available with any system`;
}
