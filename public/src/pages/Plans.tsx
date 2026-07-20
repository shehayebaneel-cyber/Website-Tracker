import type { ReactNode } from "react";
import { SectionHeading, PlanCard, CTABand } from "../components/ui";
import { Icon } from "../components/icons";
import { PLANS, CHARGED_SEPARATELY } from "../data/content";

type Cell = boolean | string;
const COMPARE: { label: string; basic: Cell; standard: Cell; premium: Cell }[] = [
  { label: "Pages / sections", basic: "Up to 6", standard: "Multi-page", premium: "Custom" },
  { label: "Monthly small updates", basic: "1", standard: "3", premium: "Up to 5" },
  { label: "Booking system", basic: false, standard: true, premium: true },
  { label: "Online store", basic: false, standard: true, premium: true },
  { label: "Owner dashboard", basic: false, standard: "Basic", premium: "Advanced" },
  { label: "Staff accounts", basic: false, standard: "Up to 3", premium: true },
  { label: "Customer accounts", basic: false, standard: false, premium: true },
  { label: "Inventory", basic: false, standard: false, premium: "Add-on" },
  { label: "Delivery management", basic: false, standard: false, premium: "Add-on" },
  { label: "Reports & analytics", basic: false, standard: false, premium: "Basic" },
  { label: "Priority support", basic: false, standard: false, premium: true },
  { label: "Owner training", basic: false, standard: false, premium: true },
  { label: "Custom integrations", basic: false, standard: false, premium: "Available" },
];

function cell(v: Cell): ReactNode {
  if (v === true) return <span style={{ color: "var(--orange)", display: "inline-flex" }}><Icon.check /></span>;
  if (v === false) return <span style={{ color: "var(--line)" }}>—</span>;
  return <span className="text-sm" style={{ color: "var(--ink-2)" }}>{v}</span>;
}

export default function Plans() {
  return (
    <>
      <section className="section" style={{ paddingBottom: 24 }}>
        <div className="container">
          <SectionHeading center eyebrow="Affordable website plans for small businesses" title="Bring Your Business Online" sub="Professional websites without a large upfront cost. Choose a monthly plan that fits your business." />
          <div className="mt-12 grid gap-6 md:grid-cols-3" style={{ alignItems: "start" }}>
            {PLANS.map((p) => <PlanCard key={p.key} plan={p} full />)}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="section" style={{ background: "var(--cream)" }}>
        <div className="container">
          <SectionHeading center title="Compare the plans" />

          {/* Desktop table */}
          <div className="mt-10 hidden overflow-hidden md:block" style={{ background: "var(--paper)", borderRadius: "var(--r)", border: "1px solid var(--line)" }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="px-5 py-4 text-left" style={{ fontFamily: "var(--font-display)" }}>Feature</th>
                  {["Basic", "Standard", "Premium"].map((n, i) => (
                    <th key={n} className="px-5 py-4 text-center" style={{ fontFamily: "var(--font-display)", color: i === 1 ? "var(--orange)" : "var(--ink)", background: i === 1 ? "var(--peach)" : "transparent" }}>{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((r, idx) => (
                  <tr key={r.label} style={{ borderTop: "1px solid var(--line-2)", background: idx % 2 ? "var(--cream)" : "transparent" }}>
                    <td className="px-5 py-3.5 font-medium">{r.label}</td>
                    <td className="px-5 py-3.5 text-center">{cell(r.basic)}</td>
                    <td className="px-5 py-3.5 text-center" style={{ background: "rgba(252,239,231,.5)" }}>{cell(r.standard)}</td>
                    <td className="px-5 py-3.5 text-center">{cell(r.premium)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile comparison cards */}
          <div className="mt-8 flex flex-col gap-4 md:hidden">
            {(["basic", "standard", "premium"] as const).map((key) => {
              const name = key[0].toUpperCase() + key.slice(1);
              return (
                <div key={key} className="card p-5" style={{ background: "var(--paper)" }}>
                  <div className="mb-3 font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--font-display)", color: key === "standard" ? "var(--orange)" : "var(--ink)" }}>{name}</div>
                  <div className="flex flex-col gap-2">
                    {COMPARE.map((r) => (
                      <div key={r.label} className="flex items-center justify-between" style={{ borderBottom: "1px solid var(--line-2)", paddingBottom: 6 }}>
                        <span className="text-sm" style={{ color: "var(--muted)" }}>{r.label}</span>
                        <span>{cell(r[key])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Honest pricing */}
      <section className="section">
        <div className="container" style={{ maxWidth: 900 }}>
          <SectionHeading eyebrow="Clear, honest pricing" title="No hidden charges" sub="Some things are priced separately because they're provided by others or depend on your needs. We always explain and approve every extra cost before any work begins." />
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {CHARGED_SEPARATELY.map((c) => (
              <div key={c} className="flex items-center gap-3 rounded-xl p-3.5" style={{ background: "var(--cream)" }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--orange)", flexShrink: 0 }} />
                <span className="text-sm" style={{ color: "var(--ink-2)" }}>{c}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm" style={{ color: "var(--muted)" }}>
            Additional prices are approved before work begins. Minimum subscription periods may apply. Work outside the agreed scope is always quoted first.
          </p>
        </div>
      </section>

      <CTABand title="Not sure which plan fits your business?" text="Contact IGNIS for a free consultation and package recommendation." primary={{ label: "Start Your Website", to: "/start" }} whatsappText="Hi IGNIS, which plan fits my business?" />
    </>
  );
}
