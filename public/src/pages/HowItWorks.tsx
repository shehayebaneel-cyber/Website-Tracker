import { SectionHeading, CTABand } from "../components/ui";
import { STEPS } from "../data/content";

const DETAIL: Record<number, string[]> = {
  1: ["Share your business name, services and prices", "Send your logo and photos (or we help with them)", "Tell us what you want customers to do online"],
  2: ["We recommend the right plan for your goals", "Add any advanced modules you need", "Everything is explained in simple language — no jargon"],
  3: ["We design your website around your brand", "You review it and request changes", "We connect booking, ordering or your dashboard"],
  4: ["We launch your website with hosting and SSL", "We provide your monthly updates and support", "We're one WhatsApp message away whenever you need us"],
};

export default function HowItWorks() {
  return (
    <>
      <section className="section" style={{ paddingBottom: 24 }}>
        <div className="container">
          <SectionHeading center eyebrow="How it works" title="From idea to launch, we handle everything" sub="You focus on your business. We build, launch and support your online presence." />
        </div>
      </section>

      <section style={{ paddingBottom: 40 }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <div className="flex flex-col gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="card flex flex-col gap-4 p-6 sm:flex-row">
                <span className="step-num" style={{ flexShrink: 0 }}>{s.n}</span>
                <div>
                  <div className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>{s.title}</div>
                  <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{s.text}</p>
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {DETAIL[s.n].map((d) => (
                      <li key={d} className="flex items-start gap-2 text-sm" style={{ color: "var(--ink-2)" }}>
                        <span style={{ color: "var(--orange)", marginTop: 2 }}>·</span> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABand title="Ready to start?" text="Tell us about your business — it only takes a few minutes." primary={{ label: "Start Your Website", to: "/start" }} whatsappText="Hi IGNIS, I'd like to get started." />
    </>
  );
}
