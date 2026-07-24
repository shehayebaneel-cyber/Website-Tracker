// ---------------------------------------------------------------------------
// The testing scenarios from the pricing spec (section 32), run against the
// real catalogue in the database. These are the acceptance criteria for the
// pricing engine: if they pass, every surface built on `quote()` shows numbers
// that agree with each other.
//
//   npm run test:pricing
//
// No test framework — the server has no test dependency and this needs none.
// Exits non-zero on failure so it can gate a deploy later.
// ---------------------------------------------------------------------------

import "dotenv/config";
import { prisma } from "./db.js";
import { loadCatalogue } from "./pricingCatalogue.js";
import {
  quote,
  maxStandardMonthly,
  packIsAvailable,
  packsLostWithout,
  type Catalogue,
  type Quote,
} from "./pricing.js";

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`    ✓ ${name}`);
  } else {
    failed++;
    console.log(`    ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function eq(name: string, actual: unknown, expected: unknown) {
  check(name, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function lines(q: Quote): string {
  return q.monthly.map((l) => `${l.label} $${l.amount}`).join(" + ");
}

const ALL_PACKS = [
  "capacity-scale",
  "customers-loyalty",
  "staff-operations",
  "inventory-suppliers",
  "delivery-tracking",
  "insights-automation",
];

async function run(cat: Catalogue) {
  // -- 1. Informational website ----------------------------------------------
  console.log("\n  Informational website");
  {
    const q = quote(cat, {});
    console.log(`    ${lines(q)}`);
    eq("total is $10", q.monthlyTotal, 10);
    eq("one line only", q.monthly.length, 1);
    eq("no systems", q.systemKeys.length, 0);
    check("no limits to show", q.limits.length === 0);
  }

  // -- 2. Booking website ------------------------------------------------------
  console.log("\n  Booking website");
  {
    const q = quote(cat, { systemKeys: ["booking"] });
    console.log(`    ${lines(q)}`);
    eq("total is $20", q.monthlyTotal, 20);
    eq("base is still charged once", q.monthly.filter((l) => l.kind === "base").length, 1);
    eq("30 services included", q.limits.find((l) => l.key === "services")?.value, 30);
    eq("3 bookable staff included", q.limits.find((l) => l.key === "staff")?.value, 3);
  }

  // -- 3. E-commerce website ---------------------------------------------------
  console.log("\n  E-commerce website");
  {
    const q = quote(cat, { systemKeys: ["store"] });
    console.log(`    ${lines(q)}`);
    eq("total is $20", q.monthlyTotal, 20);
    eq("50 products included", q.limits.find((l) => l.key === "products")?.value, 50);
  }

  // -- 4. Booking and E-commerce ----------------------------------------------
  console.log("\n  Booking and E-commerce");
  {
    const q = quote(cat, { systemKeys: ["booking", "store"] });
    console.log(`    ${lines(q)}`);
    eq("total is $30", q.monthlyTotal, 30);

    // The promise that adding the second system later costs the same as having
    // had it from the start.
    const booking = quote(cat, { systemKeys: ["booking"] });
    const store = quote(cat, { systemKeys: ["store"] });
    eq("adding E-commerce to Booking costs exactly $10", q.monthlyTotal - booking.monthlyTotal, 10);
    eq("adding Booking to E-commerce costs exactly $10", q.monthlyTotal - store.monthlyTotal, 10);
    eq(
      "both together cost exactly the sum of the two",
      q.monthlyTotal,
      booking.monthlyTotal + store.monthlyTotal - cat.base.price
    );
  }

  // -- 5. Booking with three packs ---------------------------------------------
  console.log("\n  Booking with three packs");
  {
    const q = quote(cat, {
      systemKeys: ["booking"],
      packKeys: ["customers-loyalty", "staff-operations", "insights-automation"],
    });
    console.log(`    ${lines(q)}`);
    eq("total is $35", q.monthlyTotal, 35);
    eq("all three packs charged", q.packKeys.length, 3);
    eq("nothing unmet", q.unmet.length, 0);
  }

  // -- 6. E-commerce with four packs -------------------------------------------
  console.log("\n  E-commerce with four packs");
  {
    const q = quote(cat, {
      systemKeys: ["store"],
      packKeys: ["capacity-scale", "customers-loyalty", "inventory-suppliers", "delivery-tracking"],
    });
    console.log(`    ${lines(q)}`);
    eq("total is $40", q.monthlyTotal, 40);
    eq("capacity raises products to 250", q.limits.find((l) => l.key === "products")?.value, 250);
    check("and marks it as upgraded", q.limits.find((l) => l.key === "products")?.upgraded === true);
  }

  // -- 7. Complete configuration -----------------------------------------------
  console.log("\n  Complete configuration");
  {
    const q = quote(cat, { systemKeys: ["booking", "store"], packKeys: ALL_PACKS });
    console.log(`    ${lines(q)}`);
    eq("total is $60", q.monthlyTotal, 60);
    eq("which is the catalogue's maximum", q.monthlyTotal, maxStandardMonthly(cat));
    eq("one capacity pack raises every limit", q.limits.filter((l) => l.upgraded).length, 3);
    eq("services raised to 100", q.limits.find((l) => l.key === "services")?.value, 100);
    eq("staff raised to 10", q.limits.find((l) => l.key === "staff")?.value, 10);
    eq("products raised to 250", q.limits.find((l) => l.key === "products")?.value, 250);
    check("no issue is raised at the maximum", q.issues.length === 0, JSON.stringify(q.issues));
  }

  // -- The $60 ceiling, proven rather than asserted ------------------------------
  console.log("\n  The standard maximum");
  {
    eq("catalogue maximum is $60", maxStandardMonthly(cat), 60);
    // Nothing a customer can select may exceed it.
    const everything = quote(cat, {
      systemKeys: cat.systems.map((s) => s.key),
      packKeys: cat.packs.map((p) => p.key),
      oneTimeKeys: cat.oneTime.map((o) => o.key),
      externalKeys: cat.external.map((e) => e.key),
    });
    eq("selecting literally everything still costs $60/month", everything.monthlyTotal, 60);
    check(
      "one-time work is excluded from the monthly total",
      everything.oneTime.length > 0 && everything.monthlyTotal === 60
    );
    check(
      "external costs are excluded from every IGNIS total",
      everything.external.length > 0 && everything.oneTimeTotal === everything.oneTime.reduce((s, l) => s + (l.amount ?? 0), 0)
    );
  }

  // -- 8. Booking customer selects Delivery --------------------------------------
  console.log("\n  Booking customer selects Delivery");
  {
    const q = quote(cat, { systemKeys: ["booking"], packKeys: ["delivery-tracking"] });
    console.log(`    ${lines(q)}`);
    eq("the pack is not charged", q.monthlyTotal, 20);
    eq("one unmet requirement is reported", q.unmet.length, 1);
    check("it explains why", (q.unmet[0]?.message ?? "").toLowerCase().includes("e-commerce"));
    eq("it offers E-commerce as the fix", q.unmet[0]?.addSystems[0]?.key, "store");
    eq("at $10", q.unmet[0]?.addSystems[0]?.price, 10);
    check("and blocks submission until resolved", q.unmet[0]?.blocking === true);

    // Accepting the offer produces exactly the promised price.
    const fixed = quote(cat, { systemKeys: ["booking", "store"], packKeys: ["delivery-tracking"] });
    eq("accepting it costs $10 more, plus the pack", fixed.monthlyTotal, 35);
    eq("and nothing is unmet", fixed.unmet.length, 0);
  }

  // -- Inventory has the same requirement -----------------------------------------
  console.log("\n  Booking customer selects Inventory");
  {
    const q = quote(cat, { systemKeys: ["booking"], packKeys: ["inventory-suppliers"] });
    eq("not charged", q.monthlyTotal, 20);
    eq("offers E-commerce", q.unmet[0]?.addSystems[0]?.key, "store");
  }

  // -- 9. Customer removes E-commerce ---------------------------------------------
  console.log("\n  Customer removes E-commerce");
  {
    const selected = ["customers-loyalty", "inventory-suppliers", "delivery-tracking"];
    const lost = packsLostWithout(cat, ["booking", "store"], "store", selected);
    eq("two packs would be lost", lost.length, 2);
    check(
      "and they are named so the customer can confirm",
      lost.map((p) => p.key).sort().join(",") === "delivery-tracking,inventory-suppliers",
      lost.map((p) => p.key).join(",")
    );
    check(
      "Customers & Loyalty survives, because it needs no particular system",
      !lost.some((p) => p.key === "customers-loyalty")
    );
  }

  // -- Packs need a core system ----------------------------------------------------
  console.log("\n  Informational-only cannot take packs");
  {
    for (const key of ALL_PACKS) {
      const pack = cat.packs.find((p) => p.key === key)!;
      check(`${pack.name} unavailable with no system`, !packIsAvailable(pack, []));
    }
    const q = quote(cat, { packKeys: ["customers-loyalty"] });
    eq("so the total stays at $10", q.monthlyTotal, 10);
    eq("and the reason is reported", q.unmet.length, 1);
  }

  // -- 10. Duplicate pack ------------------------------------------------------------
  console.log("\n  Duplicate selections");
  {
    const q = quote(cat, {
      systemKeys: ["booking", "booking"],
      packKeys: ["customers-loyalty", "customers-loyalty", "customers-loyalty"],
    });
    console.log(`    ${lines(q)}`);
    eq("the pack is charged once", q.monthly.filter((l) => l.key === "customers-loyalty").length, 1);
    eq("the system is charged once", q.monthly.filter((l) => l.key === "booking").length, 1);
    eq("total is $25", q.monthlyTotal, 25);
  }

  // -- 11. Custom integration ---------------------------------------------------------
  console.log("\n  Custom integration");
  {
    const q = quote(cat, {
      systemKeys: ["store"],
      oneTimeKeys: ["custom-integration", "logo-design"],
    });
    const custom = q.oneTime.find((l) => l.key === "custom-integration")!;
    check("shown as requiring a quotation", custom.isQuote === true);
    eq("with no invented price", custom.amount, null);
    eq("the monthly total is untouched", q.monthlyTotal, 20);
    eq("priced setup work still totals correctly", q.oneTimeTotal, 60);
    check("and the quote flag is raised", q.oneTimeNeedsQuote === true);
  }

  // -- 12. External costs ---------------------------------------------------------------
  console.log("\n  External provider costs");
  {
    const q = quote(cat, { systemKeys: ["store"], externalKeys: ["domain", "gateway-fees"] });
    eq("listed for the customer", q.external.length, 2);
    eq("but never added to the monthly total", q.monthlyTotal, 20);
    eq("nor to the one-time total", q.oneTimeTotal, 0);
  }

  // -- Worked examples in the catalogue must price to what they claim ----------------------
  console.log("\n  Example setups price correctly");
  {
    const setups = await prisma.recommendedSetup.findMany({ where: { active: true }, orderBy: { order: "asc" } });
    const expected: Record<string, number> = {
      informational: 10,
      salon: 35,
      retail: 40,
      restaurant: 40,
      complete: 60,
    };
    for (const s of setups) {
      const q = quote(cat, { systemKeys: s.systemKeys, packKeys: s.packKeys });
      eq(`${s.name} is $${expected[s.key]}`, q.monthlyTotal, expected[s.key]);
      check(`${s.name} has no unmet requirement`, q.unmet.length === 0, JSON.stringify(q.unmet));
    }
  }
}

async function main() {
  const cat = await loadCatalogue();
  console.log(
    `Catalogue: base $${cat.base.price} · ${cat.systems.length} systems · ${cat.packs.length} packs · ` +
      `${cat.oneTime.length} one-time · ${cat.external.length} external`
  );
  await run(cat);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  await prisma.$disconnect();
  if (failed) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
