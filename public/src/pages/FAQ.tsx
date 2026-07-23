// General questions come from `data/content.ts`; every question that mentions a
// price, a limit or plan eligibility comes from the pricing catalogue, so the
// answers here always match the plans and the Plan Builder.

import { useState } from "react";
import { SectionHeading, CTABand } from "../components/ui";
import { FAQ as GENERAL } from "../data/content";
import { useCatalogue } from "../lib/catalogue";

function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="mt-6 flex flex-col gap-3">
      {items.map((f) => {
        const isOpen = open === f.q;
        return (
          <div key={f.q} className="card overflow-hidden">
            <button onClick={() => setOpen(isOpen ? null : f.q)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
              <span className="font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{f.q}</span>
              <span aria-hidden style={{ color: "var(--orange)", fontSize: "1.4rem", lineHeight: 1, transform: isOpen ? "rotate(45deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>+</span>
            </button>
            {isOpen && <div className="px-5 pb-5 text-sm" style={{ color: "var(--ink-2)", marginTop: -4 }}>{f.a}</div>}
          </div>
        );
      })}
    </div>
  );
}

function GroupTitle({ children }: { children: string }) {
  return (
    <h3 className="mt-12 text-sm font-semibold uppercase tracking-widest" style={{ fontFamily: "var(--font-display)", color: "var(--muted)" }}>{children}</h3>
  );
}

export default function FAQ() {
  const { catalogue } = useCatalogue();
  const pricing = (catalogue?.faqs ?? []).map((f) => ({ q: f.question, a: f.answer }));
  const glossary = catalogue?.glossary ?? [];

  return (
    <>
      <section className="section" style={{ paddingBottom: 24 }}>
        <div className="container" style={{ maxWidth: 780 }}>
          <SectionHeading center eyebrow="Questions & answers" title="Frequently asked questions" sub="Everything you need to know — in plain language, no jargon." />

          <GroupTitle>General</GroupTitle>
          <Accordion items={GENERAL} />

          {pricing.length > 0 && (
            <>
              <GroupTitle>Pricing, plans & add-ons</GroupTitle>
              <Accordion items={pricing} />
            </>
          )}

          {glossary.length > 0 && (
            <>
              <GroupTitle>What these words mean</GroupTitle>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {glossary.map((g) => (
                  <div key={g.title} className="rounded-xl p-4" style={{ background: "var(--cream)" }}>
                    <div className="font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{g.title}</div>
                    <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>{g.body}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <CTABand title="Still have a question?" text="Ask us on WhatsApp — we're happy to help." primary={{ label: "Start Your Website", to: "/start" }} whatsappText="Hi IGNIS, I have a question about your plans." />
    </>
  );
}
