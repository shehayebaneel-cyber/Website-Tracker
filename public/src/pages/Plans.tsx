// Pricing — the build-your-own journey, rendered entirely from the catalogue.
//
// Four starting options, all priced as base + systems; a comparison of those
// four; worked examples whose totals are computed from the systems and packs
// they name; then the honest-pricing sections. Nothing on this page states a
// price, a limit or a heading of its own.

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/icons";
import { SectionHeading, CTABand, LoadingCards, LoadError } from "../components/ui";
import { useConfiguration } from "../lib/configuration";
import {
  oneTimePrice,
  priceLabel,
  startingOptions,
  text,
  useCatalogue,
  websiteTypeName,
  type Catalogue,
  type ComparisonRow,
} from "../lib/catalogue";
import { priceSelection } from "../lib/quote";

/** Values the catalogue uses to mean plain yes / no. */
const YES = ["included", "yes"];
const NO = ["not available", "not included", "no", "none", "—"];

function cell(v: string) {
  const k = v.trim().toLowerCase();
  if (YES.includes(k)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--orange)" }}>
        <Icon.check /> Included
      </span>
    );
  }
  if (NO.includes(k)) return <span className="text-sm" style={{ color: "var(--muted)" }}>{v}</span>;
  return <span className="text-sm" style={{ color: "var(--ink-2)" }}>{v}</span>;
}

export default function Plans() {
  const { catalogue, loading, error } = useCatalogue();
  const { apply } = useConfiguration();
  const navigate = useNavigate();

  const options = useMemo(() => (catalogue ? startingOptions(catalogue) : []), [catalogue]);

  function start(systemKeys: string[], packKeys: string[] = []) {
    apply({ systemKeys, packKeys });
    navigate("/builder");
  }

  if (error) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <LoadError message={error} whatsappText="Hi IGNIS, could you send me your pricing?" />
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Starting options */}
      <section className="section" style={{ paddingBottom: 24 }}>
        <div className="container">
          <SectionHeading
            center
            eyebrow="Pricing"
            title={text(catalogue, "pricing.heading", "Build your website your way")}
            sub={text(catalogue, "pricing.sub")}
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" style={{ alignItems: "start" }}>
            {loading && <LoadingCards count={4} height={330} />}
            {catalogue &&
              options.map((o) => {
                const Ic = (Icon as any)[o.icon ?? "sparkle"] ?? Icon.sparkle;
                const isBoth = o.systemKeys.length > 1;
                return (
                  <div
                    key={o.key}
                    className="flex h-full flex-col p-6"
                    style={{
                      borderRadius: "var(--r-lg)",
                      background: isBoth ? "#f1efec" : "var(--paper)",
                      border: `1px solid ${isBoth ? "transparent" : "var(--line)"}`,
                      boxShadow: isBoth ? "var(--shadow-pop)" : "var(--shadow-card)",
                    }}
                  >
                    <span style={{ color: "var(--orange)" }}><Ic /></span>
                    <div className="mt-3 font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>{o.name}</div>
                    <div className="mt-2 flex items-end gap-1">
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2.1rem", lineHeight: 1, color: isBoth ? "var(--orange)" : "var(--ink)" }}>
                        {priceLabel(o.price)}
                      </span>
                      <span className="text-sm" style={{ color: "var(--muted)" }}>{catalogue.base!.priceNote}</span>
                    </div>
                    <p className="mt-3 flex-1 text-sm" style={{ color: "var(--muted)" }}>{o.description}</p>

                    {/* Always show the arithmetic, never just the total. */}
                    <div className="mt-4 rounded-xl p-3 text-xs" style={{ background: isBoth ? "var(--paper)" : "var(--cream)", color: "var(--ink-2)" }}>
                      {priceLabel(catalogue.base!.price)} base website
                      {catalogue.systems
                        .filter((s) => o.systemKeys.includes(s.key))
                        .map((s) => ` + ${priceLabel(s.price)} ${s.shortName}`)}
                    </div>

                    <button type="button" onClick={() => start(o.systemKeys)} className={`btn btn-block mt-4 ${isBoth ? "btn-primary" : "btn-dark"}`}>
                      {o.ctaLabel}
                    </button>
                  </div>
                );
              })}
          </div>

          {catalogue && (
            <div className="mt-8 text-center">
              <p className="text-sm font-semibold" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
                {text(catalogue, "pricing.packsNote")}
              </p>
              <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>{text(catalogue, "pricing.formula")}</p>
            </div>
          )}
        </div>
      </section>

      {/* What the base website always includes */}
      {catalogue?.base && (
        <section className="section" style={{ background: "var(--cream)" }}>
          <div className="container" style={{ maxWidth: 900 }}>
            <SectionHeading
              eyebrow="Every website includes"
              title={catalogue.base.heading}
              sub={catalogue.base.description}
            />
            <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
              {catalogue.base.inclusions.map((label) => (
                <div key={label} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--ink-2)" }}>
                  <Icon.check /> <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Comparison of the four starting points */}
      {catalogue && catalogue.comparison.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHeading center title="Compare the starting options" />

            <div className="mt-10 hidden overflow-hidden md:block" style={{ background: "var(--paper)", borderRadius: "var(--r)", border: "1px solid var(--line)" }}>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="px-5 py-4 text-left" style={{ fontFamily: "var(--font-display)" }}>Feature</th>
                    {options.map((o) => (
                      <th key={o.key} className="px-4 py-4 text-center" style={{ fontFamily: "var(--font-display)", color: o.systemKeys.length > 1 ? "var(--orange)" : "var(--ink)", background: o.systemKeys.length > 1 ? "var(--peach)" : "transparent" }}>
                        {o.name.replace(" Website", "")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catalogue.comparison.map((r, i) => (
                    <tr key={r.label} style={{ borderTop: "1px solid var(--line-2)", background: i % 2 ? "var(--cream)" : "transparent" }}>
                      <td className="px-5 py-3.5 font-medium">
                        {r.label}
                        {r.note && <div className="mt-0.5 text-xs font-normal" style={{ color: "var(--muted)" }}>{r.note}</div>}
                      </td>
                      {options.map((o) => (
                        <td key={o.key} className="px-4 py-3.5 text-center" style={{ background: o.systemKeys.length > 1 ? "rgba(252,239,231,.5)" : undefined }}>
                          {cell(columnFor(r, o.key))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: one card per starting option, no horizontal scrolling */}
            <div className="mt-8 flex flex-col gap-4 md:hidden">
              {options.map((o) => (
                <div key={o.key} className="card p-5">
                  <div className="mb-1 font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--font-display)", color: o.systemKeys.length > 1 ? "var(--orange)" : "var(--ink)" }}>
                    {o.name.replace(" Website", "")}
                  </div>
                  <div className="mb-3 text-sm" style={{ color: "var(--muted)" }}>{priceLabel(o.price)}{catalogue.base!.priceNote}</div>
                  <div className="flex flex-col gap-2">
                    {catalogue.comparison.map((r) => (
                      <div key={r.label} className="flex items-start justify-between gap-4" style={{ borderBottom: "1px solid var(--line-2)", paddingBottom: 6 }}>
                        <span className="text-sm" style={{ color: "var(--muted)" }}>{r.label}</span>
                        <span className="text-right">{cell(columnFor(r, o.key))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Worked examples — priced from what they contain */}
      {catalogue && catalogue.setups.length > 0 && (
        <section className="section" style={{ background: "var(--cream)" }}>
          <div className="container">
            <SectionHeading
              center
              eyebrow="Examples, not plans"
              title="What other businesses choose"
              sub="Each one is a starting point you can change — the totals below are simply what those choices add up to."
            />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {catalogue.setups.map((s) => (
                <SetupCard key={s.key} setup={s} catalogue={catalogue} onUse={() => start(s.systemKeys, s.packKeys)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* One-time work and external costs */}
      {catalogue && (
        <section className="section">
          <div className="container" style={{ maxWidth: 980 }}>
            <SectionHeading
              eyebrow="Clear, honest pricing"
              title="What sits outside your monthly subscription"
              sub={text(catalogue, "pricing.maxNote")}
            />
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>One-time services</h3>
                <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Charged once, never added to your monthly total.</p>
                <div className="mt-4 flex flex-col gap-2">
                  {catalogue.oneTime.map((o) => (
                    <div key={o.key} className="flex items-baseline justify-between gap-4 rounded-xl p-3" style={{ background: "var(--cream)" }}>
                      <span className="text-sm" style={{ color: "var(--ink-2)" }}>{o.name}</span>
                      <span className="whitespace-nowrap text-xs" style={{ color: o.isQuote ? "var(--muted)" : "var(--orange)", fontFamily: "var(--font-display)", fontWeight: 600 }}>
                        {oneTimePrice(o)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>External provider costs</h3>
                <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Paid to another company, never to IGNIS.</p>
                <div className="mt-4 flex flex-col gap-2">
                  {catalogue.external.map((e) => (
                    <div key={e.key} className="rounded-xl p-3" style={{ background: "var(--cream)" }}>
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-sm" style={{ color: "var(--ink-2)" }}>{e.name}</span>
                        <span className="whitespace-nowrap text-xs" style={{ color: "var(--muted)" }}>{e.provider}</span>
                      </div>
                      {e.description && <div className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>{e.description}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {catalogue.terms.length > 0 && (
              <>
                <h3 className="mt-12 font-semibold" style={{ fontFamily: "var(--font-display)" }}>Pricing terms</h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {catalogue.terms.map((t) => (
                    <li key={t} className="text-sm" style={{ color: "var(--muted)" }}>· {t}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      )}

      <CTABand
        title="Not sure what your business needs?"
        text="Answer a few questions and we'll suggest a starting point you can change."
        primary={{ label: "Help me build my website", to: "/help-me-build" }}
        whatsappText="Hi IGNIS, which website setup fits my business?"
      />
    </>
  );
}

/** A worked example. Its total is derived, never typed into the catalogue. */
function SetupCard({
  setup, catalogue, onUse,
}: {
  setup: Catalogue["setups"][number]; catalogue: Catalogue; onUse: () => void;
}) {
  const q = priceSelection(catalogue, { systemKeys: setup.systemKeys, packKeys: setup.packKeys });
  const Ic = (Icon as any)[setup.icon ?? "sparkle"] ?? Icon.sparkle;

  return (
    <div className="card flex flex-col p-6" style={{ background: "var(--paper)" }}>
      <div className="flex items-center gap-3">
        <span className="grid place-items-center" style={{ width: 40, height: 40, borderRadius: 11, background: "var(--peach)", color: "var(--orange)", flexShrink: 0 }}><Ic /></span>
        <div>
          <div className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>{setup.name}</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>{websiteTypeName(catalogue, setup.systemKeys)}</div>
        </div>
      </div>
      {setup.description && <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>{setup.description}</p>}

      <div className="mt-4 flex flex-1 flex-col gap-1.5">
        {q.monthly.map((l) => (
          <div key={l.key} className="flex items-baseline justify-between gap-3 text-sm">
            <span style={{ color: "var(--ink-2)" }}>{l.label}</span>
            <span style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}>{priceLabel(l.amount, l.kind !== "base")}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-baseline justify-between border-t pt-3" style={{ borderColor: "var(--line)" }}>
        <span className="text-sm font-semibold">Total</span>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", color: "var(--orange)" }}>
          {priceLabel(q.monthlyTotal)}<span className="text-sm font-normal" style={{ color: "var(--muted)" }}>/month</span>
        </span>
      </div>

      <button type="button" onClick={onUse} className="btn btn-dark btn-block mt-4">Use This Setup</button>
    </div>
  );
}

/** A comparison row's column for one starting option. */
function columnFor(row: ComparisonRow, optionKey: string): string {
  const map: Record<string, string> = {
    informational: row.informational,
    booking: row.booking,
    store: row.store,
    both: row.both,
  };
  return map[optionKey] ?? "—";
}
