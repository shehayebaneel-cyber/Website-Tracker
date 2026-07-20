import { SectionHeading, CTABand } from "../components/ui";
import { Icon } from "../components/icons";

const VALUES = [
  { icon: "bolt", title: "Affordable by design", text: "Monthly plans instead of a large upfront cost, so any business can get online." },
  { icon: "shield", title: "Clear, honest pricing", text: "Every cost is explained and approved before work begins. No hidden charges." },
  { icon: "chat", title: "Real ongoing support", text: "We don't disappear after launch — we maintain, update and support your site every month." },
  { icon: "sparkle", title: "Built for non-technical owners", text: "Simple language, simple dashboards. You run your business; we handle the technology." },
];

export default function About() {
  return (
    <>
      <section className="section" style={{ paddingBottom: 24 }}>
        <div className="container" style={{ maxWidth: 760, textAlign: "center" }}>
          <SectionHeading center eyebrow="About IGNIS" title="We build digital experiences for growing businesses" sub="IGNIS helps small businesses get online with professional websites and business systems — built, managed and supported for a simple monthly plan." />
        </div>
      </section>

      <section style={{ paddingBottom: 40 }}>
        <div className="container">
          <div className="grid gap-5 sm:grid-cols-2">
            {VALUES.map((v) => {
              const Ic = (Icon as any)[v.icon];
              return (
                <div key={v.title} className="card flex gap-4 p-6">
                  <span className="grid place-items-center" style={{ width: 46, height: 46, borderRadius: 12, background: "var(--peach)", color: "var(--orange)", flexShrink: 0 }}><Ic /></span>
                  <div>
                    <div className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>{v.title}</div>
                    <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{v.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--cream)" }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <SectionHeading title="Why monthly plans?" sub="Building a professional website usually means a big upfront bill, then paying again every time you need help. We flipped that: a predictable monthly plan that includes hosting, security, maintenance and a set of updates every month — so your website keeps working and improving as your business grows." />
        </div>
      </section>

      <CTABand title="Let's build your online presence" primary={{ label: "Start Your Website", to: "/start" }} whatsappText="Hi IGNIS, I'd like to learn more about working with you." />
    </>
  );
}
