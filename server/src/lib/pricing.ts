// ---------------------------------------------------------------------------
// Pricing engine — the single source of truth for every price a customer sees.
//
// The model is deliberately ADDITIVE:
//
//     monthly total = base website + chosen core systems + chosen feature packs
//
// Every customer starts on the same base website. Booking and E-commerce are
// priced in their own right, so choosing both costs exactly the sum of the two
// — there is no combined price that could drift out of step, and adding the
// second system later costs exactly what it costs on its own.
//
// Feature packs are flat-priced bundles. Related capability lives in ONE pack,
// so nothing overlaps and nothing is charged twice: the same pack cannot be
// added twice, and a pack is never sold to a customer whose systems can't run
// it. One-time services and external provider costs are reported separately and
// are NEVER part of the monthly total.
//
// Nothing here is stored. A quote is DERIVED from the catalogue plus the
// customer's selection, exactly like calc.ts derives balances and statuses.
// (A submitted configuration snapshots its breakdown so a later price change
// never rewrites what the customer was actually shown.)
//
// This module is intentionally free of Prisma and Express imports so the public
// web app can run the very same code and get identical numbers.
// ---------------------------------------------------------------------------

export type SystemKey = string; // "booking" | "store" (data-driven)

export interface BaseWebsiteDef {
  key: string;
  name: string;
  price: number;
  includedSections: number;
  monthlyUpdates: number;
}

export interface SystemLimitDef {
  key: string; // services | staff | products
  label: string;
  unitLabel: string;
  baseValue: number;
  upgradedValue: number;
}

export interface CoreSystemDef {
  key: SystemKey;
  name: string;
  shortName: string;
  price: number;
  order: number;
  limits: SystemLimitDef[];
}

export interface FeaturePackDef {
  key: string;
  name: string;
  price: number;
  /** Systems this pack cannot work without. Empty = any system will do. */
  requiresSystems: SystemKey[];
  /** Systems it may be combined with. Empty = all of them. */
  compatibleSystems: SystemKey[];
  /** Why the requirement exists, in the customer's language. */
  requiresReason: string | null;
  /** The pack that lifts every system limit to its upgraded value. */
  raisesLimits: boolean;
  order: number;
}

export interface OneTimeServiceDef {
  key: string;
  name: string;
  startingPrice: number | null;
  isQuote: boolean;
}

export interface ExternalCostDef {
  key: string;
  name: string;
  provider: string | null;
  costType: string;
}

export interface Catalogue {
  base: BaseWebsiteDef;
  systems: CoreSystemDef[];
  packs: FeaturePackDef[];
  oneTime: OneTimeServiceDef[];
  external: ExternalCostDef[];
}

export interface Selection {
  systemKeys?: SystemKey[];
  packKeys?: string[];
  oneTimeKeys?: string[];
  externalKeys?: string[];
}

export type LineKind = "base" | "system" | "pack";

export interface LineItem {
  kind: LineKind;
  key: string;
  label: string;
  detail?: string;
  amount: number;
}

export interface OneTimeLine {
  key: string;
  label: string;
  /** null when the work has to be quoted — never invent a number. */
  amount: number | null;
  isQuote: boolean;
}

export interface ExternalLine {
  key: string;
  label: string;
  provider: string | null;
  costType: string;
}

/** A limit the customer's configuration actually gives them. */
export interface ResolvedLimit {
  systemKey: SystemKey;
  key: string;
  label: string;
  unitLabel: string;
  value: number;
  baseValue: number;
  /** true when a pack lifted it above the system's standard allowance. */
  upgraded: boolean;
}

/**
 * A pack the customer asked for that their systems can't run, together with
 * the exact thing that would fix it. Never just an error: the customer is told
 * what to add and what it costs, and may decline.
 */
export interface UnmetRequirement {
  packKey: string;
  packName: string;
  /** Systems that would satisfy it — any ONE of them is enough. */
  addSystems: { key: SystemKey; name: string; price: number }[];
  message: string;
  blocking: boolean;
}

export interface ValidationIssue {
  code: string;
  message: string;
  blocking: boolean;
}

export interface Quote {
  systemKeys: SystemKey[];
  packKeys: string[];

  /** Charged every month. Base first, then systems, then packs. */
  monthly: LineItem[];
  monthlyTotal: number;

  /** Charged once. Never part of monthlyTotal. */
  oneTime: OneTimeLine[];
  oneTimeTotal: number;
  /** true when some one-time work has no price yet. */
  oneTimeNeedsQuote: boolean;

  /** Paid to other providers. Never part of any IGNIS total. */
  external: ExternalLine[];

  limits: ResolvedLimit[];
  unmet: UnmetRequirement[];
  issues: ValidationIssue[];

  /** Base + every system + every pack: the ceiling this catalogue can produce. */
  maxStandardMonthly: number;
}

const money = (n: number) => Math.round(n * 100) / 100;

/** Base + all systems + all packs. The advertised maximum, derived not asserted. */
export function maxStandardMonthly(cat: Catalogue): number {
  return money(
    cat.base.price +
      cat.systems.reduce((s, x) => s + x.price, 0) +
      cat.packs.reduce((s, p) => s + p.price, 0)
  );
}

/** Can this pack run on exactly these systems? */
export function packIsAvailable(pack: FeaturePackDef, systemKeys: SystemKey[]): boolean {
  // Every pack needs at least one core system: there is nothing for it to
  // extend on an informational-only website.
  if (systemKeys.length === 0) return false;
  if (pack.requiresSystems.length && !pack.requiresSystems.some((k) => systemKeys.includes(k))) {
    return false;
  }
  if (pack.compatibleSystems.length && !systemKeys.some((k) => pack.compatibleSystems.includes(k))) {
    return false;
  }
  return true;
}

/**
 * Packs that would stop working if `systemKey` were removed. The builder asks
 * for confirmation with this list rather than silently dropping them.
 */
export function packsLostWithout(
  cat: Catalogue,
  systemKeys: SystemKey[],
  systemKey: SystemKey,
  selectedPackKeys: string[]
): FeaturePackDef[] {
  const remaining = systemKeys.filter((k) => k !== systemKey);
  return cat.packs.filter(
    (p) => selectedPackKeys.includes(p.key) && !packIsAvailable(p, remaining)
  );
}

/**
 * Resolve a selection into a quote.
 *
 * Duplicates are removed before anything is priced, so the same system or pack
 * can never be charged twice however it arrives.
 */
export function quote(cat: Catalogue, sel: Selection): Quote {
  const issues: ValidationIssue[] = [];

  const systemByKey = new Map(cat.systems.map((s) => [s.key, s]));
  const packByKey = new Map(cat.packs.map((p) => [p.key, p]));

  // --- 1. systems -------------------------------------------------------------
  const systemKeys: SystemKey[] = [];
  for (const key of sel.systemKeys ?? []) {
    if (systemKeys.includes(key)) continue; // never charge the same system twice
    if (!systemByKey.has(key)) {
      issues.push({ code: "unknown-system", message: `"${key}" is no longer available.`, blocking: false });
      continue;
    }
    systemKeys.push(key);
  }
  systemKeys.sort((a, b) => (systemByKey.get(a)!.order ?? 0) - (systemByKey.get(b)!.order ?? 0));

  // --- 2. packs ---------------------------------------------------------------
  const packKeys: string[] = [];
  const unmet: UnmetRequirement[] = [];

  for (const key of sel.packKeys ?? []) {
    if (packKeys.includes(key)) continue; // never charge the same pack twice
    const pack = packByKey.get(key);
    if (!pack) {
      issues.push({ code: "unknown-pack", message: `"${key}" is no longer available.`, blocking: false });
      continue;
    }

    if (packIsAvailable(pack, systemKeys)) {
      packKeys.push(key);
      continue;
    }

    // Not available — say what would make it work, and what that costs.
    const needed = (pack.requiresSystems.length ? pack.requiresSystems : cat.systems.map((s) => s.key))
      .filter((k) => !systemKeys.includes(k))
      .map((k) => systemByKey.get(k))
      .filter((s): s is CoreSystemDef => Boolean(s))
      .map((s) => ({ key: s.key, name: s.name, price: money(s.price) }));

    unmet.push({
      packKey: pack.key,
      packName: pack.name,
      addSystems: needed,
      message:
        pack.requiresReason ??
        `${pack.name} needs ${needed.map((n) => n.name).join(" or ")} to work.`,
      blocking: true,
    });
  }

  packKeys.sort((a, b) => (packByKey.get(a)!.order ?? 0) - (packByKey.get(b)!.order ?? 0));

  // --- 3. monthly lines -------------------------------------------------------
  const monthly: LineItem[] = [
    { kind: "base", key: cat.base.key, label: cat.base.name, amount: money(cat.base.price) },
  ];

  for (const key of systemKeys) {
    const s = systemByKey.get(key)!;
    monthly.push({ kind: "system", key: s.key, label: s.name, amount: money(s.price) });
  }
  for (const key of packKeys) {
    const p = packByKey.get(key)!;
    monthly.push({ kind: "pack", key: p.key, label: p.name, amount: money(p.price) });
  }

  const monthlyTotal = money(monthly.reduce((s, l) => s + l.amount, 0));

  // --- 4. limits --------------------------------------------------------------
  const raises = packKeys.some((k) => packByKey.get(k)!.raisesLimits);
  const limits: ResolvedLimit[] = [];
  for (const key of systemKeys) {
    const s = systemByKey.get(key)!;
    for (const l of s.limits) {
      limits.push({
        systemKey: s.key,
        key: l.key,
        label: l.label,
        unitLabel: l.unitLabel,
        value: raises ? l.upgradedValue : l.baseValue,
        baseValue: l.baseValue,
        upgraded: raises && l.upgradedValue > l.baseValue,
      });
    }
  }

  // --- 5. one-time work and external costs ------------------------------------
  const oneTimeByKey = new Map(cat.oneTime.map((o) => [o.key, o]));
  const oneTime: OneTimeLine[] = [];
  for (const key of new Set(sel.oneTimeKeys ?? [])) {
    const o = oneTimeByKey.get(key);
    if (!o) continue;
    oneTime.push({
      key: o.key,
      label: o.name,
      // Quotation work never gets an invented number.
      amount: o.isQuote ? null : o.startingPrice ?? null,
      isQuote: o.isQuote || o.startingPrice == null,
    });
  }
  const oneTimeTotal = money(oneTime.reduce((s, l) => s + (l.amount ?? 0), 0));

  const externalByKey = new Map(cat.external.map((e) => [e.key, e]));
  const external: ExternalLine[] = [];
  for (const key of new Set(sel.externalKeys ?? [])) {
    const e = externalByKey.get(key);
    if (!e) continue;
    external.push({ key: e.key, label: e.name, provider: e.provider, costType: e.costType });
  }

  // --- 6. sanity --------------------------------------------------------------
  const max = maxStandardMonthly(cat);
  if (monthlyTotal > max) {
    // Only reachable if the catalogue itself is inconsistent; say so rather
    // than quietly showing a total above the advertised ceiling.
    issues.push({
      code: "above-maximum",
      message: `This total is above the standard maximum of $${max}/month. Please contact us.`,
      blocking: false,
    });
  }

  return {
    systemKeys,
    packKeys,
    monthly,
    monthlyTotal,
    oneTime,
    oneTimeTotal,
    oneTimeNeedsQuote: oneTime.some((l) => l.isQuote),
    external,
    limits,
    unmet,
    issues,
    maxStandardMonthly: max,
  };
}
