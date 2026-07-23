// ---------------------------------------------------------------------------
// The 9 configuration scenarios from the pricing spec (section 27), run against
// the real catalogue in the database. These are the acceptance criteria for the
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
import { quote, type Catalogue, type Quote } from "./pricing.js";

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

async function run(cat: Catalogue) {
  // -- Scenario 1: Basic website ------------------------------------------
  console.log("\n  Scenario 1 — Basic website");
  {
    const q = quote(cat, { planKey: "basic", capacities: { sections: 6 } });
    console.log(`    ${lines(q)}`);
    eq("monthly total is $10", q.monthlyTotal, 10);
    eq("no plan upgrade", q.upgrades.length, 0);
    eq("no blocking issues", q.issues.filter((i) => i.blocking).length, 0);
  }

  // -- Scenario 2: Standard booking ---------------------------------------
  console.log("\n  Scenario 2 — Standard booking, 30 services, 3 staff");
  {
    const q = quote(cat, {
      planKey: "standard", coreSystem: "booking",
      capacities: { services: 30, staff: 3 },
    });
    console.log(`    ${lines(q)}`);
    eq("monthly total is $20", q.monthlyTotal, 20);
    eq("nothing charged above the allowance", q.monthly.filter((l) => l.kind === "capacity").length, 0);
  }

  // -- Scenario 3: Standard store, 100 products ---------------------------
  console.log("\n  Scenario 3 — Standard store, 100 products");
  {
    const q = quote(cat, {
      planKey: "standard", coreSystem: "store", capacities: { products: 100 },
    });
    console.log(`    ${lines(q)}`);
    eq("monthly total is $25", q.monthlyTotal, 25);
    const cap = q.monthly.find((l) => l.kind === "capacity" && l.key === "products");
    eq("charged for 50 extra products", cap?.amount, 5);
    check("shows what was included", cap?.detail?.includes("50 included") ?? false, cap?.detail);
  }

  // -- Scenario 4: Standard + Customer Accounts ---------------------------
  console.log("\n  Scenario 4 — Standard store + Customer Accounts");
  {
    const q = quote(cat, {
      planKey: "standard", coreSystem: "store", addOnKeys: ["customer-accounts"],
    });
    console.log(`    ${lines(q)}`);
    eq("monthly total is $25", q.monthlyTotal, 25);
    eq("stays on Standard", q.planKey, "standard");
  }

  // -- Scenario 5: Premium ------------------------------------------------
  console.log("\n  Scenario 5 — Premium booking + Customer Accounts");
  {
    const q = quote(cat, {
      planKey: "premium", coreSystem: "booking", addOnKeys: ["customer-accounts"],
    });
    console.log(`    ${lines(q)}`);
    eq("monthly total is $30", q.monthlyTotal, 30);
    const ca = q.included.find((l) => l.key === "customer-accounts");
    check("Customer Accounts shown as included", !!ca, "not found in included[]");
    eq("Customer Accounts not charged again", q.monthly.filter((l) => l.key === "customer-accounts").length, 0);
  }

  // -- Scenario 6: Premium + Inventory ------------------------------------
  console.log("\n  Scenario 6 — Premium store + Inventory Management");
  {
    const q = quote(cat, {
      planKey: "premium", coreSystem: "store", addOnKeys: ["inventory-management"],
    });
    console.log(`    ${lines(q)}`);
    eq("monthly total is $40", q.monthlyTotal, 40);
  }

  // -- Scenario 7: Standard customer selects Inventory --------------------
  console.log("\n  Scenario 7 — Standard selects Inventory (Premium required)");
  {
    const q = quote(cat, {
      planKey: "standard", coreSystem: "store", addOnKeys: ["inventory-management"],
    });
    console.log(`    ${lines(q)}`);
    eq("plan escalated to Premium", q.planKey, "premium");
    eq("requested plan preserved", q.requestedPlanKey, "standard");
    eq("one upgrade recorded", q.upgrades.length, 1);
    check("upgrade names the trigger", q.upgrades[0]?.triggeredBy.includes("Inventory Management"), JSON.stringify(q.upgrades[0]?.triggeredBy));
    check("upgrade explains why", (q.upgrades[0]?.message ?? "").includes("advanced business management tools"), q.upgrades[0]?.message);
    eq("priced as Premium + Inventory", q.monthlyTotal, 40);
  }

  // -- Scenario 8: Premium + Advanced Analytics ---------------------------
  console.log("\n  Scenario 8 — Premium + Advanced Reports & Analytics");
  {
    const q = quote(cat, {
      planKey: "premium", coreSystem: "booking", addOnKeys: ["advanced-reports"],
    });
    console.log(`    ${lines(q)}`);
    eq("Advanced Reports charged as an add-on", q.monthly.find((l) => l.key === "advanced-reports")?.amount, 5);
    eq("monthly total is $35", q.monthlyTotal, 35);
  }

  // -- Scenario 9: Custom quotation ---------------------------------------
  console.log("\n  Scenario 9 — Premium + custom integration (quotation)");
  {
    const q = quote(cat, {
      planKey: "premium", coreSystem: "store", addOnKeys: ["custom-admin-tools"],
    });
    console.log(`    ${lines(q)}`);
    eq("quote item listed separately", q.quoteItems.length, 1);
    eq("no invented price in the total", q.monthlyTotal, 30);
    eq("quote item carries no amount", q.quoteItems[0]?.amount, 0);
  }

  // -- Extra: rules the spec states outside the scenario list -------------
  console.log("\n  Dependency and duplicate-charge rules");
  {
    // Loyalty requires Customer Accounts (section 15)
    const q = quote(cat, {
      planKey: "standard", coreSystem: "store", addOnKeys: ["loyalty-rewards"],
    });
    const auto = q.autoAdded.find((a) => a.key === "customer-accounts");
    check("Loyalty auto-adds Customer Accounts", !!auto, JSON.stringify(q.autoAdded));
    check("and explains why", (auto?.message ?? "").includes("Loyalty and Rewards requires Customer Accounts"), auto?.message);
    eq("Standard + Loyalty + Customer Accounts = $30", q.monthlyTotal, 30);
  }
  {
    // On Premium the auto-added dependency must not be charged (section 16)
    const q = quote(cat, {
      planKey: "premium", coreSystem: "store", addOnKeys: ["loyalty-rewards"],
    });
    eq("Premium + Loyalty = $35 (accounts included)", q.monthlyTotal, 35);
    check("Customer Accounts included, not charged", q.included.some((l) => l.key === "customer-accounts"), JSON.stringify(q.included.map((i) => i.key)));
  }
  {
    // Section 10 — recommend the cheaper plan rather than switching silently
    const q = quote(cat, {
      planKey: "standard", coreSystem: "store",
      addOnKeys: ["customer-accounts", "advanced-reports"],
      capacities: { updates: 5 },
    });
    // The spec's own example ($33 Standard) assumes Premium includes the reports
    // the customer paid for — it doesn't; section 4 makes Advanced Reports an
    // add-on on BOTH plans. So Premium is $35 here, i.e. $2 MORE, and the
    // recommendation must say so honestly rather than claim a saving.
    console.log(`    Standard stack: $${q.monthlyTotal}/month`);
    eq("Standard stack totals $33", q.monthlyTotal, 33);
    eq("still surfaces Premium", q.recommendation?.switchTo, "premium");
    eq("but labels it as costing more", q.recommendation?.kind, "unlocks");
    eq("with the true difference", q.recommendation?.difference, 2);
    check("and never claims a saving", (q.recommendation?.message ?? "").includes("more"), q.recommendation?.message);
  }
  {
    // Section 4 — Standard may not have both core systems
    const q = quote(cat, { planKey: "standard", coreSystem: "both" });
    check("Standard blocks 'both'", q.issues.some((i) => i.code === "core-both-unavailable" && i.blocking), JSON.stringify(q.issues));
    const p = quote(cat, { planKey: "premium", coreSystem: "both" });
    eq("Premium prices the second system", p.monthlyTotal, 40);
  }
  {
    // Section 25 — a core system must be chosen
    const q = quote(cat, { planKey: "standard" });
    check("missing core system blocks submission", q.issues.some((i) => i.code === "core-required" && i.blocking), JSON.stringify(q.issues));
  }
  {
    // A cheaper plan that cannot do what was asked for is not a saving.
    // Basic has no core system, so pricing a booking setup against it drops
    // the booking system and makes $10 look like a $10/month saving.
    const q = quote(cat, { planKey: "standard", coreSystem: "booking" });
    check(
      "never recommends a plan that drops the chosen core system",
      q.recommendation?.switchTo !== "basic",
      JSON.stringify(q.recommendation)
    );
    const s = quote(cat, { planKey: "standard", coreSystem: "store" });
    check(
      "same for an online store",
      s.recommendation?.switchTo !== "basic",
      JSON.stringify(s.recommendation)
    );
  }
  {
    // Bundled features never carry their own price
    const q = quote(cat, {
      planKey: "premium", coreSystem: "store", addOnKeys: ["low-stock-alerts"],
    });
    check("bundled feature shown as included", q.included.some((l) => l.key === "low-stock-alerts"), JSON.stringify(q.included.map((i) => i.key)));
    check("and pulls in its parent module", q.monthly.some((l) => l.key === "inventory-management"), lines(q));
  }
}

async function main() {
  const cat = await loadCatalogue();
  console.log(`Catalogue: ${cat.plans.length} plans · ${cat.addOns.length} add-ons · ${cat.capacity.length} capacity upgrades`);
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
