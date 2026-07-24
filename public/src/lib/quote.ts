// ---------------------------------------------------------------------------
// Pricing in the browser.
//
// The builder needs a total that updates as fast as a customer clicks, so it
// runs the REAL engine (`server/src/lib/pricing.ts`, aliased to `@engine`)
// against the catalogue it already fetched. Not a copy of the rules — the same
// module the server prices with, so the two cannot disagree.
//
// The server is still the authority: POST /api/public/pricing/configurations
// re-prices every submission before storing it. What the customer sees here is
// an estimate that happens to be computed by the same code.
// ---------------------------------------------------------------------------

import {
  quote as engineQuote,
  maxStandardMonthly as engineMax,
  packIsAvailable,
  packsLostWithout as engineLost,
  type Catalogue as EngineCatalogue,
  type Quote,
  type Selection,
} from "@engine";
import type { Catalogue } from "./catalogue";

export type { Quote, Selection };
export type {
  LineItem,
  OneTimeLine,
  ExternalLine,
  ResolvedLimit,
  UnmetRequirement,
  ValidationIssue,
} from "@engine";
export { packIsAvailable };

/** The API payload carries display fields the engine has no use for. */
export function toEngineCatalogue(cat: Catalogue): EngineCatalogue {
  return {
    base: {
      key: cat.base!.key,
      name: cat.base!.name,
      price: cat.base!.price,
      includedSections: cat.base!.includedSections,
      monthlyUpdates: cat.base!.monthlyUpdates,
    },
    systems: cat.systems.map((s) => ({
      key: s.key,
      name: s.name,
      shortName: s.shortName,
      price: s.price,
      order: s.order,
      limits: s.limits.map((l) => ({
        key: l.key,
        label: l.label,
        unitLabel: l.unitLabel,
        baseValue: l.baseValue,
        upgradedValue: l.upgradedValue,
      })),
    })),
    packs: cat.packs.map((p) => ({
      key: p.key,
      name: p.name,
      price: p.price,
      requiresSystems: p.requiresSystems,
      compatibleSystems: p.compatibleSystems,
      requiresReason: p.requiresReason,
      raisesLimits: p.raisesLimits,
      order: p.order,
    })),
    oneTime: cat.oneTime.map((o) => ({
      key: o.key,
      name: o.name,
      startingPrice: o.startingPrice,
      isQuote: o.isQuote,
    })),
    external: cat.external.map((e) => ({
      key: e.key,
      name: e.name,
      provider: e.provider,
      costType: e.costType,
    })),
  };
}

export function priceSelection(cat: Catalogue, selection: Selection): Quote {
  return engineQuote(toEngineCatalogue(cat), selection);
}

export function maxStandardMonthly(cat: Catalogue): number {
  return engineMax(toEngineCatalogue(cat));
}

/** Packs that would stop working if this system were removed. */
export function packsLostWithout(
  cat: Catalogue,
  systemKeys: string[],
  systemKey: string,
  selectedPackKeys: string[]
) {
  return engineLost(toEngineCatalogue(cat), systemKeys, systemKey, selectedPackKeys);
}

/**
 * The message a customer sends on WhatsApp. Built from the quote, so it can
 * never claim a total the summary did not show.
 */
export function quoteMessage(cat: Catalogue, q: Quote, websiteType: string): string {
  const packNames = q.packKeys
    .map((k) => cat.packs.find((p) => p.key === k)?.name)
    .filter(Boolean) as string[];

  const lines = [
    `Hello IGNIS, I would like ${addArticle(websiteType)}` +
      (packNames.length ? ` with ${listSentence(packNames)}` : "") +
      `. My estimated IGNIS subscription is $${q.monthlyTotal}/month.`,
  ];

  if (q.oneTime.length) {
    lines.push(
      "",
      "One-time services:",
      ...q.oneTime.map((l) => `· ${l.label}${l.isQuote ? " (requires quotation)" : ` — $${l.amount}`}`)
    );
  }
  if (q.external.length) {
    lines.push("", "External costs noted:", ...q.external.map((l) => `· ${l.label}`));
  }
  return lines.join("\n");
}

function addArticle(name: string): string {
  return /^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`;
}

/** "A, B and C" — the way a person would say it. */
export function listSentence(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
