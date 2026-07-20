import { useState } from "react";
import { SectionHeading, CTABand } from "../components/ui";
import { FAQ as FAQS } from "../data/content";

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <>
      <section className="section" style={{ paddingBottom: 24 }}>
        <div className="container" style={{ maxWidth: 780 }}>
          <SectionHeading center eyebrow="Questions & answers" title="Frequently asked questions" sub="Everything you need to know — in plain language, no jargon." />
          <div className="mt-10 flex flex-col gap-3">
            {FAQS.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={f.q} className="card overflow-hidden">
                  <button onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
                    <span className="font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{f.q}</span>
                    <span aria-hidden style={{ color: "var(--orange)", fontSize: "1.4rem", lineHeight: 1, transform: isOpen ? "rotate(45deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>+</span>
                  </button>
                  {isOpen && <div className="px-5 pb-5 text-sm" style={{ color: "var(--ink-2)", marginTop: -4 }}>{f.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <CTABand title="Still have a question?" text="Ask us on WhatsApp — we're happy to help." primary={{ label: "Start Your Website", to: "/start" }} whatsappText="Hi IGNIS, I have a question about your plans." />
    </>
  );
}
