// ---------------------------------------------------------------------------
// Pricing engine — the single source of truth for every price the customer sees.
//
// Plan cards, the comparison table, the feature catalogue, the Plan Builder,
// the WhatsApp message and the final request summary all resolve through
// `quote()`. That is what makes them structurally unable to contradict each
// other: there is only one place that decides what is included, what is
// charged, and what still needs a quotation.
//
// Nothing here is stored. A quote is DERIVED from the catalogue plus the
// customer's selection, exactly like calc.ts derives balances and statuses.
// (A submitted PlanConfiguration snapshots its breakdown so a later price
// change never rewrites what the customer was actually shown.)
//
// This module is intentionally free of Prisma and Express imports so the same
// logic can be mirrored into the public web app and produce identical numbers.
// ---------------------------------------------------------------------------

export type PlanKey = string; // basic | standard | premium (data-driven)
export type CoreSystem = "booking" | "store" | "both";
export type PricingType = "monthly" | "onetime" | "quote" | "external" | "bundled";

/** Plan ranking is data-driven: order in the catalogue defines "higher". */
export interface PricingPlanDef {
  key: PlanKey;
  name: string;
  basePrice: number;
  priceIsFrom: boolean;
  coreSystemMode: "none" | "choose-one" | "one-included-both-available";
  bothSystemsPrice: number | null;
  includedSections: number | null;
  includedUpdates: number;
  includedProducts: number | null;
  includedServices: number | null;
  includedStaff: number | null;
  includedLocations: number;
  order: number;
}

export interface AddOnDef {
  key: string;
  name: string;
  categoryKey: string;
  pricingType: PricingType;
  price: number | null;
  priceIsFrom: boolean;
  priceLabel: string | null;
  minPlan: PlanKey;
  includedInPlans: PlanKey[];
  bundledWith: string | null;
  dependencies: DependencyDef[];
}

export interface DependencyDef {
  requiresType: "addon" | "coreSystem";
  /** AddOn key, or a core system: "booking" | "store" | "booking|store" */
  requiresKey: string;
  note: string | null;
}

export interface CapacityDef {
  key: string; // products | services | staff | updates | locations
  name: string;
  unitLabel: string;
  stepSize: number;
  pricePerStep: number;
  maxSteps: number | null;
  appliesToPlans: PlanKey[];
  requiresCoreSystem: string | null;
  order: number;
}

export interface Catalogue {
  plans: PricingPlanDef[];
  addOns: AddOnDef[];
  capacity: CapacityDef[];
}

export interface Selection {
  planKey: PlanKey;
  coreSystem?: CoreSystem | null;
  /** Desired TOTAL for each dimension (not the delta). e.g. { products: 100 } */
  capacities?: Record<string, number>;
  addOnKeys?: string[];
}

export type LineKind =
  | "plan"
  | "coreSystem"
  | "capacity"
  | "addon";

export interface LineItem {
  kind: LineKind;
  key: string;
  label: string;
  detail?: string;
  amount: number;
  /** true when covered by the plan and shown as "Included" rather than $0. */
  included: boolean;
  isFrom: boolean;
  quantity?: number;
}

export interface PlanUpgrade {
  from: PlanKey;
  to: PlanKey;
  /** Add-on names that forced the upgrade — the customer must see the reason. */
  triggeredBy: string[];
  message: string;
}

export interface AutoAdded {
  key: string;
  name: string;
  requiredBy: string;
  message: string;
}

export interface Recommendation {
  switchTo: PlanKey;
  direction: "up" | "down";
  /**
   * saves   — the other plan genuinely costs less for this exact configuration
   * same    — identical price, but more headroom
   * unlocks — costs a little MORE; offered as an honest upsell, never as a saving
   */
  kind: "saves" | "same" | "unlocks";
  message: string;
  /** Positive = money saved per month by switching. Negative for "unlocks". */
  saving: number;
  /** Signed difference: alternative total − current total. */
  difference: number;
}

/**
 * How much more per month a higher plan may cost and still be worth surfacing.
 * Above this we stay quiet rather than pushing a customer upward.
 */
export const UPGRADE_NUDGE_LIMIT = 5;

export interface ValidationIssue {
  code: string;
  message: string;
  blocking: boolean;
}

export interface Quote {
  requestedPlanKey: PlanKey;
  planKey: PlanKey;
  coreSystem: CoreSystem | null;
  upgrades: PlanUpgrade[];
  autoAdded: AutoAdded[];
  /** Charged every month. */
  monthly: LineItem[];
  /** Charged once, at setup. */
  oneTime: LineItem[];
  /** Paid to other companies — never part of a total. */
  external: LineItem[];
  /** No automatic price is possible — never part of a total. */
  quoteItems: LineItem[];
  /** Covered by the plan. Shown as "Included", never as a $0 charge. */
  included: LineItem[];
  monthlyTotal: number;
  oneTimeTotal: number;
  recommendation: Recommendation | null;
  issues: ValidationIssue[];
}

const money = (n: number) => Math.round(n * 100) / 100;

function planRank(cat: Catalogue, key: PlanKey): number {
  const p = cat.plans.find((x) => x.key === key);
  return p ? p.order : -1;
}

function planOf(cat: Catalogue, key: PlanKey): PricingPlanDef | undefined {
  return cat.plans.find((x) => x.key === key);
}

/** Does `have` satisfy a minimum-plan requirement of `need`? */
function meetsPlan(cat: Catalogue, have: PlanKey, need: PlanKey): boolean {
  return planRank(cat, have) >= planRank(cat, need);
}

function coreSatisfies(selected: CoreSystem | null, requiresKey: string): boolean {
  if (!selected) return false;
  if (selected === "both") return true;
  return requiresKey.split("|").includes(selected);
}

/**
 * Resolve a selection into a full quote.
 *
 * Order matters:
 *   1. expand dependencies (may pull in more add-ons, recursively)
 *   2. escalate the plan if any selected add-on requires a higher one
 *   3. re-check inclusions against the FINAL plan, so a Premium customer is
 *      never charged for something Premium already includes
 *   4. price capacity above the final plan's allowances
 */
export function quote(cat: Catalogue, sel: Selection): Quote {
  return quoteWith(cat, sel, true);
}

/**
 * `withRecommendation` is false when called from `recommend()` itself, which
 * prices the same selection against neighbouring plans to compare totals.
 * Without it the two would call each other forever.
 */
function quoteWith(cat: Catalogue, sel: Selection, withRecommendation: boolean): Quote {
  const issues: ValidationIssue[] = [];
  const requestedPlanKey = sel.planKey;
  const byKey = new Map(cat.addOns.map((a) => [a.key, a]));

  // --- 1. expand dependencies -------------------------------------------------
  const chosen: string[] = [];
  const autoAdded: AutoAdded[] = [];
  const seen = new Set<string>();

  const add = (key: string, requiredBy?: string) => {
    if (seen.has(key)) return;
    const a = byKey.get(key);
    if (!a) {
      issues.push({
        code: "unknown-addon",
        message: `"${key}" is no longer available.`,
        blocking: false,
      });
      return;
    }
    seen.add(key);
    chosen.push(key);
    if (requiredBy) {
      autoAdded.push({
        key,
        name: a.name,
        requiredBy,
        message: `${requiredBy} requires ${a.name}. ${a.name} has been added to your plan.`,
      });
    }
    for (const d of a.dependencies) {
      if (d.requiresType === "addon") add(d.requiresKey, a.name);
    }
  };

  for (const k of sel.addOnKeys ?? []) add(k);

  // A bundled add-on ships inside its parent — pull the parent in too.
  for (const k of [...chosen]) {
    const a = byKey.get(k);
    if (a?.bundledWith) add(a.bundledWith, a.name);
  }

  // --- 2. escalate the plan ---------------------------------------------------
  let planKey = requestedPlanKey;
  const upgrades: PlanUpgrade[] = [];
  const forcing = chosen
    .map((k) => byKey.get(k)!)
    .filter((a) => !meetsPlan(cat, planKey, a.minPlan));

  if (forcing.length) {
    // Escalate to the highest minPlan any selected add-on demands.
    const target = forcing.reduce(
      (hi, a) => (planRank(cat, a.minPlan) > planRank(cat, hi) ? a.minPlan : hi),
      planKey
    );
    const names = forcing.map((a) => a.name);
    upgrades.push({
      from: planKey,
      to: target,
      triggeredBy: names,
      message: `${names.join(", ")} ${
        names.length > 1 ? "require" : "requires"
      } ${planOf(cat, target)?.name ?? target} because ${
        names.length > 1 ? "they use" : "it uses"
      } advanced business management tools. Your plan has been upgraded to ${
        planOf(cat, target)?.name ?? target
      }.`,
    });
    planKey = target;
  }

  const plan = planOf(cat, planKey);
  if (!plan) {
    return {
      requestedPlanKey,
      planKey,
      coreSystem: sel.coreSystem ?? null,
      upgrades,
      autoAdded,
      monthly: [],
      oneTime: [],
      external: [],
      quoteItems: [],
      included: [],
      monthlyTotal: 0,
      oneTimeTotal: 0,
      recommendation: null,
      issues: [
        { code: "no-plan", message: "Select a plan to continue.", blocking: true },
      ],
    };
  }

  // --- core system ------------------------------------------------------------
  let coreSystem = sel.coreSystem ?? null;
  if (plan.coreSystemMode === "none") {
    coreSystem = null;
  } else if (!coreSystem) {
    issues.push({
      code: "core-required",
      message: `Choose whether you need bookings or an online store with ${plan.name}.`,
      blocking: true,
    });
  } else if (coreSystem === "both" && plan.coreSystemMode === "choose-one") {
    issues.push({
      code: "core-both-unavailable",
      message: `${plan.name} includes one core system. Both are available with Premium.`,
      blocking: true,
    });
  }

  const monthly: LineItem[] = [];
  const oneTime: LineItem[] = [];
  const external: LineItem[] = [];
  const quoteItems: LineItem[] = [];
  const included: LineItem[] = [];

  monthly.push({
    kind: "plan",
    key: plan.key,
    label: `${plan.name} Plan`,
    detail: coreSystem ? coreLabel(coreSystem) : undefined,
    amount: money(plan.basePrice),
    included: false,
    isFrom: plan.priceIsFrom,
  });

  if (coreSystem === "both" && plan.bothSystemsPrice != null) {
    monthly.push({
      kind: "coreSystem",
      key: "second-core-system",
      label: "Second core system (booking and store)",
      amount: money(plan.bothSystemsPrice),
      included: false,
      isFrom: true,
    });
  }

  // --- 3. price the add-ons against the FINAL plan ----------------------------
  for (const key of chosen) {
    const a = byKey.get(key)!;

    // Dependencies on a core system can only be checked now.
    for (const d of a.dependencies) {
      if (d.requiresType === "coreSystem" && !coreSatisfies(coreSystem, d.requiresKey)) {
        issues.push({
          code: "missing-core",
          message:
            d.note ??
            `${a.name} needs ${requiresLabel(d.requiresKey)}. Choose one to continue.`,
          blocking: true,
        });
      }
    }

    const isIncluded = a.includedInPlans.includes(planKey);
    const isBundled = a.pricingType === "bundled";

    if (isIncluded || isBundled) {
      included.push({
        kind: "addon",
        key: a.key,
        label: a.name,
        detail: isBundled
          ? `Included with ${byKey.get(a.bundledWith ?? "")?.name ?? "your plan"}`
          : `Included with ${plan.name}`,
        amount: 0,
        included: true,
        isFrom: false,
      });
      continue;
    }

    const line: LineItem = {
      kind: "addon",
      key: a.key,
      label: a.name,
      detail: a.priceLabel ?? undefined,
      amount: money(a.price ?? 0),
      included: false,
      isFrom: a.priceIsFrom,
    };

    if (a.pricingType === "monthly") monthly.push(line);
    else if (a.pricingType === "onetime") oneTime.push(line);
    else if (a.pricingType === "external") external.push({ ...line, amount: 0 });
    else quoteItems.push({ ...line, amount: 0 });
  }

  // --- 4. capacity above the plan's allowance ---------------------------------
  const allowance: Record<string, number | null> = {
    products: plan.includedProducts,
    services: plan.includedServices,
    staff: plan.includedStaff,
    updates: plan.includedUpdates,
    locations: plan.includedLocations,
    sections: plan.includedSections,
  };

  for (const cap of [...cat.capacity].sort((a, b) => a.order - b.order)) {
    const desired = sel.capacities?.[cap.key];
    if (desired == null) continue;
    if (cap.appliesToPlans.length && !cap.appliesToPlans.includes(planKey)) continue;
    if (cap.requiresCoreSystem && !coreSatisfies(coreSystem, cap.requiresCoreSystem)) continue;

    const base = allowance[cap.key];
    if (base == null) continue; // dimension not available on this plan
    const extra = desired - base;
    if (extra <= 0) continue;

    let steps = Math.ceil(extra / cap.stepSize);
    if (cap.maxSteps != null && steps > cap.maxSteps) {
      steps = cap.maxSteps;
      issues.push({
        code: "capacity-max",
        message: `${cap.name} above ${base + cap.maxSteps * cap.stepSize} ${cap.unitLabel} needs a custom quotation.`,
        blocking: false,
      });
    }

    monthly.push({
      kind: "capacity",
      key: cap.key,
      label: `Additional ${steps * cap.stepSize} ${cap.unitLabel}`,
      detail: `${base} included · ${base + steps * cap.stepSize} total`,
      amount: money(steps * cap.pricePerStep),
      included: false,
      isFrom: false,
      quantity: steps,
    });
  }

  const monthlyTotal = money(monthly.reduce((s, l) => s + l.amount, 0));
  const oneTimeTotal = money(oneTime.reduce((s, l) => s + l.amount, 0));

  return {
    requestedPlanKey,
    planKey,
    coreSystem,
    upgrades,
    autoAdded,
    monthly,
    oneTime,
    external,
    quoteItems,
    included,
    monthlyTotal,
    oneTimeTotal,
    recommendation: withRecommendation
      ? recommend(cat, sel, planKey, monthlyTotal)
      : null,
    issues,
  };
}

function coreLabel(c: CoreSystem): string {
  return c === "booking"
    ? "Booking system"
    : c === "store"
    ? "Online store / ordering"
    : "Booking and store";
}

function requiresLabel(key: string): string {
  const parts = key.split("|").map((k) => (k === "booking" ? "a booking system" : "an online store or ordering system"));
  return parts.join(" or ");
}

/**
 * Would a different plan serve this configuration better?
 *
 * Upward: the next plan up already includes enough of what they're paying for
 * that it costs the same or less. Downward: nothing they selected needs the
 * plan they're on. Never applied automatically — the customer decides.
 */
function recommend(
  cat: Catalogue,
  sel: Selection,
  currentPlan: PlanKey,
  currentTotal: number
): Recommendation | null {
  const ordered = [...cat.plans].sort((a, b) => a.order - b.order);
  const idx = ordered.findIndex((p) => p.key === currentPlan);
  if (idx === -1) return null;

  const priced = (planKey: PlanKey) => {
    const q = quoteWith(cat, { ...sel, planKey }, false);
    // Only comparable if the alternative doesn't get escalated straight back,
    // and if it can actually satisfy the configuration.
    if (q.planKey !== planKey) return null;
    if (q.issues.some((i) => i.blocking)) return null;
    // A plan with no core system drops the customer's booking or store choice
    // silently and so looks cheaper than it is. Cheaper because it does less is
    // not a saving, and must never be offered as one.
    if ((sel.coreSystem ?? null) !== q.coreSystem) return null;
    return q.monthlyTotal;
  };

  const up = ordered[idx + 1];
  if (up) {
    const upTotal = priced(up.key);
    if (upTotal != null && upTotal <= currentTotal + UPGRADE_NUDGE_LIMIT) {
      const difference = money(upTotal - currentTotal);
      if (difference < 0) {
        return {
          switchTo: up.key, direction: "up", kind: "saves",
          saving: -difference, difference,
          message: `${up.name} may provide better value — several features you selected are already included, bringing your total to $${upTotal}/month.`,
        };
      }
      if (difference === 0) {
        return {
          switchTo: up.key, direction: "up", kind: "same",
          saving: 0, difference,
          message: `${up.name} costs the same for this configuration and includes more as your business grows.`,
        };
      }
      // Costs more. Say so plainly — never dress an upsell up as a saving.
      return {
        switchTo: up.key, direction: "up", kind: "unlocks",
        saving: -difference, difference,
        message: `For $${difference}/month more, ${up.name} covers this configuration and adds priority support, owner training and access to the advanced business modules.`,
      };
    }
  }

  const down = ordered[idx - 1];
  if (down) {
    const downTotal = priced(down.key);
    if (downTotal != null && downTotal < currentTotal) {
      const difference = money(downTotal - currentTotal);
      return {
        switchTo: down.key, direction: "down", kind: "saves",
        saving: -difference, difference,
        message: `Your current setup may also work with ${down.name} at $${downTotal}/month.`,
      };
    }
  }

  return null;
}

