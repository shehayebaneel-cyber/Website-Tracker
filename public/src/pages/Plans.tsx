// Plans — rendered entirely from the pricing catalogue in the database.
// Prices, inclusions, comparison rows, external costs and terms all come from
// /api/public/pricing/catalogue, so this page can never contradict the Plan
// Builder or the quote a customer is finally given.

import type { ReactNode } from "react";
import { SectionHeading, PlanCard, CTABand, LoadingCards, LoadError } from "../components/ui";
import { Icon } from "../components/icons";
import { useCatalogue, type ComparisonRow } from "../lib/catalogue";

/** Values the catalogue uses to mean "yes" / "no" with nothing to qualify. */
const YES = ["included", "yes", "available"];
const NO = ["not available", "not included", "none", "no", "—"];

function cell(v: string): ReactNode {
  const k = v.trim().toLowerCase();
  if (YES.includes(k)) return <span style={{ color: "var(--orange)", display: "inline-flex" }}><Icon.check /></span>;
  if (NO.includes(k)) return <span style={{ color: "var(--line)" }}>—</span>;
  return <span className="text-sm" style={{ color: "var(--ink-2)" }}>{v}</span>;
}

export default function Plans() {
  const { catalogue, loading, error } = useCatalogue();
  const plans = catalogue?.plans ?? [];
  const rows = catalogue?.comparison ?? [];

  return (
    <>
      <section className="section" style={{ paddingBottom: 24 }}>
        <div className="container">
          <SectionHeading center eyebrow="Affordable website plans for small businesses" title="Bring Your Business Online" sub="Professional websites without a large upfront cost. Choose a monthly plan that fits your business." />
          <div className="mt-12 grid gap-6 md:grid-cols-3" style={{ alignItems: "start" }}>
            {loading && <LoadingCards count={3} height={620} />}
            {plans.map((p) => <PlanCard key={p.key} plan={p} full />)}
          </div>
          {error && <div className="mt-10"><LoadError message={error} whatsappText="Hi IGNIS, could you send me your website plans and prices?" /></div>}
        </div>
      </section>

      {/* Comparison */}
      {rows.length > 0 && (
        <section className="section" style={{ background: "var(--cream)" }}>
          <div className="container">
            <SectionHeading center title="Compare the plans" />

            {/* Desktop table */}
            <div className="mt-10 hidden overflow-hidden md:block" style={{ background: "var(--paper)", borderRadius: "var(--r)", border: "1px solid var(--line)" }}>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="px-5 py-4 text-left" style={{ fontFamily: "var(--font-display)" }}>Feature</th>
                    {plans.map((p) => (
                      <th key={p.key} className="px-5 py-4 text-center" style={{ fontFamily: "var(--font-display)", color: p.popular ? "var(--orange)" : "var(--ink)", background: p.popular ? "var(--peach)" : "transparent" }}>{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.label} style={{ borderTop: "1px solid var(--line-2)", background: idx % 2 ? "var(--cream)" : "transparent" }}>
                      <td className="px-5 py-3.5 font-medium">
                        {r.label}
                        {r.note && <div className="mt-0.5 text-xs font-normal" style={{ color: "var(--muted)" }}>{r.note}</div>}
                      </td>
                      {plans.map((p) => (
                        <td key={p.key} className="px-5 py-3.5 text-center" style={{ background: p.popular ? "rgba(252,239,231,.5)" : undefined }}>
                          {cell(valueFor(r, p.key))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile comparison cards */}
            <div className="mt-8 flex flex-col gap-4 md:hidden">
              {plans.map((p) => (
                <div key={p.key} className="card p-5" style={{ background: "var(--paper)" }}>
                  <div className="mb-3 font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--font-display)", color: p.popular ? "var(--orange)" : "var(--ink)" }}>{p.name}</div>
                  <div className="flex flex-col gap-2">
                    {rows.map((r) => (
                      <div key={r.label} className="flex items-center justify-between gap-4" style={{ borderBottom: "1px solid var(--line-2)", paddingBottom: 6 }}>
                        <span className="text-sm" style={{ color: "var(--muted)" }}>{r.label}</span>
                        <span className="text-right">{cell(valueFor(r, p.key))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Honest pricing */}
      {catalogue && (catalogue.externalCosts.length > 0 || catalogue.terms.length > 0) && (
        <section className="section">
          <div className="container" style={{ maxWidth: 900 }}>
            <SectionHeading eyebrow="Clear, honest pricing" title="No hidden charges" sub="Some things are priced separately because they're provided by others or depend on your needs. We always explain and approve every extra cost before any work begins." />
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {catalogue.externalCosts.map((c) => (
                <div key={c} className="flex items-center gap-3 rounded-xl p-3.5" style={{ background: "var(--cream)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--orange)", flexShrink: 0 }} />
                  <span className="text-sm" style={{ color: "var(--ink-2)" }}>{c}</span>
                </div>
              ))}
            </div>
            {catalogue.terms.length > 0 && (
              <ul className="mt-8 flex flex-col gap-2">
                {catalogue.terms.map((t) => (
                  <li key={t} className="text-sm" style={{ color: "var(--muted)" }}>· {t}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <CTABand title="Not sure which plan fits your business?" text="Contact IGNIS for a free consultation and package recommendation." primary={{ label: "Start Your Website", to: "/start" }} whatsappText="Hi IGNIS, which plan fits my business?" />
    </>
  );
}

/**
 * Comparison rows carry one column per plan by name. A plan added in the admin
 * console that has no column yet shows a dash rather than a wrong value.
 */
function valueFor(row: ComparisonRow, planKey: string): string {
  const v = (row as unknown as Record<string, string | null>)[planKey];
  return v ?? "—";
}
