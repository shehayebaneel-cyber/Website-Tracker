import { Link } from "react-router-dom";
import { Icon } from "../components/icons";
import { SectionHeading, CTABand, LoadingCards, LoadError } from "../components/ui";
import { TRUST, STEPS, PROJECTS } from "../data/content";
import { useCatalogue, priceLabel, startingOptions } from "../lib/catalogue";
import { ProjectCard } from "./OurWork";

export default function Home() {
  const { catalogue, loading, error } = useCatalogue();
  const options = catalogue ? startingOptions(catalogue) : [];
  const packs = catalogue?.packs ?? [];
  // The entry price is the base website — everything else is added to it.
  const cheapest = catalogue?.base?.price ?? null;

  return (
    <>
      {/* Hero */}
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 55% at 50% -10%, rgba(232,113,43,.10), transparent 70%)" }} />
        <div className="container" style={{ position: "relative", paddingBlock: "clamp(56px, 9vw, 104px)", textAlign: "center" }}>
          <div className="eyebrow mb-4 rise">Affordable websites & business systems</div>
          <h1 className="h-display rise" style={{ maxWidth: 880, marginInline: "auto" }}>
            Build Your Business <span style={{ color: "var(--orange)" }}>Online</span> with IGNIS
          </h1>
          <p className="lead rise mt-5" style={{ maxWidth: 620, marginInline: "auto" }}>
            Professional websites and business systems without a large upfront cost. Choose a monthly plan and let us build, manage and support your online presence.
          </p>
          <div className="rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/plans" className="btn btn-primary" style={{ padding: "1.05rem 1.7rem" }}>View Website Plans <Icon.arrow /></Link>
            <Link to="/start" className="btn btn-outline" style={{ padding: "1.05rem 1.7rem" }}>Tell Us About Your Business</Link>
          </div>
          {/* The entry price comes from the catalogue — shown only once known. */}
          <div className="rise mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm" style={{ background: "var(--cream)", color: "var(--ink-2)", visibility: cheapest == null ? "hidden" : undefined }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--orange)" }} /> Plans starting from <b style={{ color: "var(--ink)" }}>{priceLabel(cheapest ?? 0)} / month</b>
          </div>
        </div>
      </section>

      {/* Trust points */}
      <section style={{ background: "var(--cream)" }}>
        <div className="container" style={{ paddingBlock: 40 }}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3 lg:grid-cols-6">
            {TRUST.map((t) => {
              const Ic = (Icon as any)[t.icon];
              return (
                <div key={t.label} className="flex flex-col items-center gap-2 text-center">
                  <span style={{ color: "var(--orange)" }}><Ic /></span>
                  <span className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>{t.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Starting options */}
      <section className="section">
        <div className="container">
          <SectionHeading
            center
            eyebrow="Simple monthly pricing"
            title="Start with your website, then add what you need"
            sub="Every website includes hosting, SSL and ongoing support. Systems and feature packs are added on top — nothing you don't use."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" style={{ alignItems: "start" }}>
            {loading && <LoadingCards count={4} height={250} />}
            {options.map((o) => {
              const Ic = (Icon as any)[o.icon ?? "sparkle"] ?? Icon.sparkle;
              return (
                <Link key={o.key} to="/plans" className="card flex flex-col p-6 transition-transform hover:-translate-y-0.5" style={{ background: "var(--paper)" }}>
                  <span style={{ color: "var(--orange)" }}><Ic /></span>
                  <div className="mt-3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>{o.name}</div>
                  <div className="mt-1 font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", color: "var(--orange)" }}>
                    {priceLabel(o.price)}<span className="text-sm font-normal" style={{ color: "var(--muted)" }}>/month</span>
                  </div>
                  <p className="mt-2 flex-1 text-sm" style={{ color: "var(--muted)" }}>{o.description}</p>
                </Link>
              );
            })}
          </div>
          {error && <div className="mt-10"><LoadError message={error} /></div>}
        </div>
      </section>

      {/* Business systems preview */}
      <section className="section" style={{ background: "var(--cream)" }}>
        <div className="container">
          <SectionHeading center eyebrow="Feature packs" title="Add complete packs, not scattered features" sub="Related tools are grouped into one pack, so nothing overlaps and nothing is charged twice." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading && <LoadingCards count={6} height={190} />}
            {packs.map((p) => {
              const Ic = (Icon as any)[p.icon ?? "sparkle"] ?? Icon.sparkle;
              return (
                <Link key={p.key} to="/business-systems" className="card flex flex-col p-6 transition-transform hover:-translate-y-0.5" style={{ background: "var(--paper)" }}>
                  <span style={{ color: "var(--orange)" }}><Ic /></span>
                  <div className="mt-3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>{p.name}</div>
                  <p className="mt-1.5 flex-1 text-sm" style={{ color: "var(--muted)" }}>{p.blurb}</p>
                  <div className="mt-3 text-sm font-semibold" style={{ color: "var(--orange)", fontFamily: "var(--font-display)" }}>
                    {priceLabel(p.price, true)}/month · {p.features.length} features
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Link to="/business-systems" className="btn btn-dark">Explore business systems <Icon.arrow /></Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section">
        <div className="container">
          <SectionHeading center eyebrow="How it works" title="From idea to launch in four simple steps" />
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

      {/* Our work preview */}
      <section className="section" style={{ background: "var(--cream)" }}>
        <div className="container">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <SectionHeading eyebrow="Our work" title="Websites we've built" sub="Real businesses, online and growing." />
            <Link to="/our-work" className="btn btn-outline">See all work <Icon.arrow /></Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECTS.slice(0, 3).map((p) => <ProjectCard key={p.name} project={p} />)}
          </div>
        </div>
      </section>

      <CTABand title="Ready to bring your business online?" text="Start your application or message us — we reply fast." primary={{ label: "Start Your Application", to: "/start" }} whatsappText="Hi IGNIS, I'd like to start a website for my business." />
    </>
  );
}
