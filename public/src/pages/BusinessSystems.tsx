import { Link } from "react-router-dom";
import { Icon } from "../components/icons";
import { SectionHeading, CTABand } from "../components/ui";
import { MODULES, EXTRA_MODULES, CHARGED_SEPARATELY, STEPS } from "../data/content";

export default function BusinessSystems() {
  return (
    <>
      <section className="section" style={{ paddingBottom: 24 }}>
        <div className="container">
          <SectionHeading center eyebrow="Premium business systems" title="Build the system your business needs" sub="Premium plans start at $30/month. Final pricing depends on the features and complexity of your system." />
        </div>
      </section>

      <section style={{ paddingBottom: 40 }}>
        <div className="container">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => {
              const Ic = (Icon as any)[m.icon];
              return (
                <div key={m.key} className="card flex flex-col p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid place-items-center" style={{ width: 44, height: 44, borderRadius: 12, background: "var(--peach)", color: "var(--orange)" }}><Ic /></span>
                    <div className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>{m.name}</div>
                  </div>
                  <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>{m.blurb}</p>
                  <ul className="mt-4 flex flex-1 flex-col gap-2">
                    {m.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "var(--ink-2)" }}><Icon.check /> {f}</li>
                    ))}
                  </ul>
                  <div className="mt-4 text-sm" style={{ color: "var(--muted)" }}><b style={{ color: "var(--ink)" }}>Great for:</b> {m.bestFor}</div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-semibold" style={{ color: "var(--orange)", fontFamily: "var(--font-display)" }}>{m.price}</span>
                    <Link to={`/start?module=${m.key}`} className="btn btn-dark" style={{ padding: "0.65rem 1.1rem", fontSize: "0.88rem" }}>Request this feature</Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* extra modules */}
          <div className="mt-6 rounded-2xl p-5 text-center" style={{ background: "var(--peach)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--orange)", fontFamily: "var(--font-display)" }}>Also available: </span>
            <span className="text-sm" style={{ color: "var(--ink-2)" }}>{EXTRA_MODULES.join(" · ")}</span>
          </div>
        </div>
      </section>

      {/* Charged separately */}
      <section className="section" style={{ background: "var(--cream)" }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <SectionHeading title="Services charged separately" sub="Every additional cost is explained and approved before work begins." />
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {CHARGED_SEPARATELY.map((c) => (
              <div key={c} className="flex items-center gap-3 rounded-xl p-3.5" style={{ background: "var(--paper)" }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--orange)", flexShrink: 0 }} />
                <span className="text-sm" style={{ color: "var(--ink-2)" }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

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
