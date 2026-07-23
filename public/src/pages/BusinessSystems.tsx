// Business features & add-ons — the whole catalogue, straight from the database.
//
// Every feature, its price, the plan it needs and what it depends on come from
// /api/public/pricing/catalogue, so this page cannot disagree with the plan
// cards or with the price a customer is finally quoted.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/icons";
import { SectionHeading, CTABand, LoadingCards, LoadError } from "../components/ui";
import { STEPS } from "../data/content";
import {
  addOnBadges,
  addOnPrice,
  bundledInto,
  priceLabel,
  type AddOnBadge,
  type Catalogue,
  type CatalogueAddOn,
  useCatalogue,
} from "../lib/catalogue";

const ALL = "all";

export default function BusinessSystems() {
  const { catalogue, loading, error } = useCatalogue();
  const [category, setCategory] = useState<string>(ALL);
  const [query, setQuery] = useState("");

  // Features that ship inside another feature are not sold on their own, so
  // they get no card — they are searchable through their parent instead.
  const sellable = useMemo(
    () => (catalogue?.addOns ?? []).filter((a) => !(a.pricingType === "bundled" && a.bundledWith)),
    [catalogue]
  );

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!catalogue) return [];
    return sellable.filter((a) => {
      if (category !== ALL && a.categoryKey !== category) return false;
      if (!q) return true;
      return matches(catalogue, a, q);
    });
  }, [catalogue, sellable, category, q]);

  const cheapestPremium = useMemo(() => {
    const withModules = catalogue?.plans.filter((p) => p.coreSystemMode === "one-included-both-available") ?? [];
    return withModules.length ? withModules[0] : null;
  }, [catalogue]);

  return (
    <>
      <section className="section" style={{ paddingBottom: 24 }}>
        <div className="container">
          <SectionHeading
            center
            eyebrow="Business features & add-ons"
            title="Build the system your business needs"
            sub={
              cheapestPremium
                ? `Start with any plan and add only what you use. Advanced business modules require ${cheapestPremium.name}, from ${priceLabel(cheapestPremium.basePrice)}${cheapestPremium.priceNote}.`
                : "Start with any plan and add only what you use."
            }
          />
        </div>
      </section>

      <section style={{ paddingBottom: 40 }}>
        <div className="container">
          {/* Filters */}
          {catalogue && (
            <div className="mb-8 flex flex-col gap-4">
              <label className="relative block" style={{ maxWidth: 460 }}>
                <span className="sr-only">Search features</span>
                <input
                  className="in"
                  type="search"
                  placeholder="Search features — inventory, loyalty, reports…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Chip on={category === ALL} onClick={() => setCategory(ALL)}>
                  All features ({sellable.length})
                </Chip>
                {catalogue.categories.map((c) => {
                  const n = sellable.filter((a) => a.categoryKey === c.key).length;
                  if (!n) return null;
                  return (
                    <Chip key={c.key} on={category === c.key} onClick={() => setCategory(c.key)}>
                      {c.name} ({n})
                    </Chip>
                  );
                })}
              </div>
              {category !== ALL && (
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  {catalogue.categories.find((c) => c.key === category)?.blurb}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {loading && <LoadingCards count={6} height={380} />}
            {catalogue &&
              results.map((a) => <AddOnCard key={a.key} addOn={a} catalogue={catalogue} />)}
          </div>

          {catalogue && results.length === 0 && (
            <div className="card p-8 text-center">
              <p style={{ color: "var(--ink-2)" }}>No feature matches “{query}”.</p>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                We build custom features too — tell us what you need and we'll quote it.
              </p>
              <Link to="/start" className="btn btn-dark mt-4">Describe what you need</Link>
            </div>
          )}

          {error && <LoadError message={error} whatsappText="Hi IGNIS, could you send me your list of business features?" />}
        </div>
      </section>

      {/* Charged separately — also from the catalogue */}
      {catalogue && catalogue.externalCosts.length > 0 && (
        <section className="section" style={{ background: "var(--cream)" }}>
          <div className="container" style={{ maxWidth: 900 }}>
            <SectionHeading title="Services charged separately" sub="Every additional cost is explained and approved before work begins." />
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {catalogue.externalCosts.map((c) => (
                <div key={c} className="flex items-center gap-3 rounded-xl p-3.5" style={{ background: "var(--paper)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--orange)", flexShrink: 0 }} />
                  <span className="text-sm" style={{ color: "var(--ink-2)" }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="section">
        <div className="container">
          <SectionHeading center title="How it works" />
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto"><span className="step-num">{s.n}</span></div>
                <div className="mt-4 font-semibold" style={{ fontFamily: "var(--font-display)" }}>{s.title}</div>
                <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABand title="Ready to discuss your system?" primary={{ label: "Request a Feature", to: "/start" }} whatsappText="Hi IGNIS, I'd like an advanced business system." />
    </>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
      style={{
        fontFamily: "var(--font-display)",
        background: on ? "var(--orange)" : "var(--cream)",
        color: on ? "#fff" : "var(--ink-2)",
        border: `1px solid ${on ? "var(--orange)" : "var(--line)"}`,
      }}
    >
      {children}
    </button>
  );
}

const TONE: Record<AddOnBadge["tone"], { bg: string; fg: string }> = {
  popular: { bg: "var(--orange)", fg: "#fff" },
  included: { bg: "var(--peach)", fg: "var(--orange)" },
  plan: { bg: "var(--cream)", fg: "var(--ink-2)" },
  needs: { bg: "var(--cream)", fg: "var(--muted)" },
};

function AddOnCard({ addOn: a, catalogue }: { addOn: CatalogueAddOn; catalogue: Catalogue }) {
  const category = catalogue.categories.find((c) => c.key === a.categoryKey);
  const Ic = (Icon as any)[a.icon ?? category?.icon ?? "sparkle"] ?? Icon.sparkle;
  const badges = addOnBadges(catalogue, a);
  const includes = a.includes.length ? a.includes : bundledInto(catalogue, a.key).map((b) => b.name);

  return (
    <div className="card flex flex-col p-6">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center" style={{ width: 44, height: 44, borderRadius: 12, background: "var(--peach)", color: "var(--orange)", flexShrink: 0 }}><Ic /></span>
        <div className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>{a.name}</div>
      </div>

      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <span key={b.label} className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: TONE[b.tone].bg, color: TONE[b.tone].fg }}>{b.label}</span>
          ))}
        </div>
      )}

      {a.blurb && <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>{a.blurb}</p>}

      <ul className="mt-4 flex flex-1 flex-col gap-2">
        {includes.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "var(--ink-2)" }}><Icon.check /> {f}</li>
        ))}
      </ul>

      {a.bestFor && (
        <div className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
          <b style={{ color: "var(--ink)" }}>Great for:</b> {a.bestFor}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="font-semibold" style={{ color: "var(--orange)", fontFamily: "var(--font-display)" }}>{addOnPrice(a)}</span>
        <Link to={`/builder?feature=${a.key}`} className="btn btn-dark" style={{ padding: "0.65rem 1.1rem", fontSize: "0.88rem" }}>Add to my plan</Link>
      </div>
    </div>
  );
}

/**
 * Search covers what a feature is called, what it does and what it contains —
 * including the sub-features that ship inside it, which have no card of their
 * own but are exactly what a customer types.
 */
function matches(cat: Catalogue, a: CatalogueAddOn, q: string): boolean {
  const haystack = [
    a.name,
    a.blurb ?? "",
    a.bestFor ?? "",
    ...a.includes,
    ...bundledInto(cat, a.key).flatMap((b) => [b.name, b.blurb ?? ""]),
    cat.categories.find((c) => c.key === a.categoryKey)?.name ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
}
