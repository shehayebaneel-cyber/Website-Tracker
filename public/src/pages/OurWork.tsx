import { useState } from "react";
import { SectionHeading, CTABand } from "../components/ui";
import { PROJECTS, WORK_FILTERS, type Project } from "../data/content";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="card overflow-hidden transition-transform hover:-translate-y-0.5">
      {/* stylized website preview */}
      <div style={{ height: 168, background: `linear-gradient(135deg, ${project.accent}, ${project.accent}cc)`, position: "relative" }}>
        <div style={{ position: "absolute", inset: "14px 14px auto", height: 26, background: "rgba(255,255,255,.9)", borderRadius: 8, display: "flex", alignItems: "center", gap: 5, padding: "0 10px" }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "#ff5f57" }} />
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "#febc2e" }} />
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "#28c840" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <span style={{ color: "#fff", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.35rem", letterSpacing: ".02em", textShadow: "0 2px 12px rgba(0,0,0,.25)" }}>{project.name}</span>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--orange)", fontFamily: "var(--font-display)" }}>{project.category}</div>
          <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>{project.plan}</span>
        </div>
        <div className="mt-1 text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>{project.name}</div>
        <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>{project.blurb}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {project.features.map((f) => (
            <span key={f} className="rounded-full px-2.5 py-1 text-xs" style={{ background: "var(--cream)", color: "var(--ink-2)" }}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OurWork() {
  const [filter, setFilter] = useState("All");
  const shown = filter === "All" ? PROJECTS : PROJECTS.filter((p) => p.category === filter);
  return (
    <>
      <section className="section" style={{ paddingBottom: 24 }}>
        <div className="container">
          <SectionHeading center eyebrow="Our work" title="Businesses we've brought online" sub="A look at websites and systems IGNIS has built across different industries." />
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {WORK_FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
                style={{ fontFamily: "var(--font-display)", background: filter === f ? "var(--ink)" : "var(--cream)", color: filter === f ? "#fff" : "var(--ink-2)" }}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section style={{ paddingBottom: 72 }}>
        <div className="container">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => <ProjectCard key={p.name} project={p} />)}
          </div>
          <p className="mt-8 text-center text-xs" style={{ color: "var(--muted)" }}>
            Client work is shown with permission. We never display private dashboards or customer data.
          </p>
        </div>
      </section>
      <CTABand title="Want a website like these?" primary={{ label: "Start Your Website", to: "/start" }} whatsappText="Hi IGNIS, I saw your work and I'd like a website." />
    </>
  );
}
