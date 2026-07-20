import { Link } from "react-router-dom";
import { Icon } from "../components/icons";
import { SectionHeading, PlanCard, CTABand } from "../components/ui";
import { PLANS, MODULES, TRUST, STEPS, PROJECTS } from "../data/content";
import { ProjectCard } from "./OurWork";

export default function Home() {
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
          <div className="rise mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm" style={{ background: "var(--cream)", color: "var(--ink-2)" }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--orange)" }} /> Plans starting from <b style={{ color: "var(--ink)" }}>$10 / month</b>
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

      {/* Plans preview */}
      <section className="section">
        <div className="container">
          <SectionHeading center eyebrow="Simple monthly plans" title="Choose the plan that fits your business" sub="Every plan includes hosting, SSL and ongoing support. No large upfront cost." />
          <div className="mt-12 grid gap-6 md:grid-cols-3" style={{ alignItems: "start" }}>
            {PLANS.map((p) => <PlanCard key={p.key} plan={p} />)}
          </div>
        </div>
      </section>

      {/* Business systems preview */}
      <section className="section" style={{ background: "var(--cream)" }}>
        <div className="container">
          <SectionHeading center eyebrow="Premium business systems" title="Build the system your business needs" sub="Add advanced modules to your website as your business grows." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => {
              const Ic = (Icon as any)[m.icon];
              return (
                <Link key={m.key} to="/business-systems" className="card flex flex-col p-6 transition-transform hover:-translate-y-0.5" style={{ background: "var(--paper)" }}>
                  <span style={{ color: "var(--orange)" }}><Ic /></span>
                  <div className="mt-3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>{m.name}</div>
                  <p className="mt-1.5 flex-1 text-sm" style={{ color: "var(--muted)" }}>{m.blurb}</p>
                  <div className="mt-3 text-sm font-semibold" style={{ color: "var(--orange)", fontFamily: "var(--font-display)" }}>{m.price}</div>
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
