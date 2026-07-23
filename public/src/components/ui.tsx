import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./icons";
import { waLink } from "../data/content";
import {
  coreSystemName,
  coreVariants,
  inclusionsFor,
  priceLabel,
  type CataloguePlan,
} from "../lib/catalogue";

export function SectionHeading({ eyebrow, title, sub, center }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; center?: boolean }) {
  return (
    <div className={center ? "text-center" : ""} style={{ maxWidth: center ? 720 : undefined, marginInline: center ? "auto" : undefined }}>
      {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
      <h2 className="h-section">{title}</h2>
      {sub && <p className="lead mt-4">{sub}</p>}
      {center && <div className="divider-orange mx-auto mt-6" />}
    </div>
  );
}

/** Compact cards list this many inclusions before "View full plan". */
const PREVIEW_INCLUSIONS = 9;

export function PlanCard({ plan, full }: { plan: CataloguePlan; full?: boolean }) {
  const popular = plan.popular;
  // The widest plan gets the emphasised border; data decides which that is.
  const premium = plan.coreSystemMode === "one-included-both-available";
  const variants = coreVariants(plan);
  const [core, setCore] = useState<string | null>(variants[0] ?? null);
  const all = inclusionsFor(plan, core);
  const features = full ? all : all.slice(0, PREVIEW_INCLUSIONS);

  return (
    <div
      className="relative flex flex-col p-6 sm:p-7"
      style={{
        borderRadius: "var(--r-lg)",
        background: popular ? "#f1efec" : "var(--paper)",
        border: premium ? "2px solid var(--orange)" : `1px solid ${popular ? "transparent" : "var(--line)"}`,
        boxShadow: popular ? "var(--shadow-pop)" : "var(--shadow-card)",
      }}
    >
      {popular && (
        <span className="pill-tag absolute left-1/2 -translate-x-1/2" style={{ top: -14 }}>Most Popular</span>
      )}
      <div className="mb-1 text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}>{plan.name}</div>
      <div className="flex items-end gap-1">
        <span className="font-display" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2.6rem", lineHeight: 1, color: popular ? "var(--orange)" : "var(--ink)" }}>{priceLabel(plan.basePrice, plan.priceIsFrom)}</span>
      </div>
      <div className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{plan.priceNote}</div>
      <div className="mt-3 font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{plan.heading}</div>

      {/* A plan whose inclusions differ by core system says so, rather than
          listing booking and store features as if you got both. */}
      {full && variants.length > 1 && (
        <div className="mt-4 flex gap-1 rounded-full p-1" style={{ background: "var(--cream)" }}>
          {variants.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setCore(v)}
              className="flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                fontFamily: "var(--font-display)",
                background: core === v ? "var(--paper)" : "transparent",
                color: core === v ? "var(--orange)" : "var(--muted)",
                boxShadow: core === v ? "var(--shadow-card)" : undefined,
              }}
            >
              {coreSystemName(v)}
            </button>
          ))}
        </div>
      )}
      {variants.length > 1 && (
        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
          {plan.coreSystemMode === "choose-one"
            ? `Choose one: ${variants.map(coreSystemName).join(" or ")}. Both are available with the plan above.`
            : "One system is included; the second can be added."}
        </p>
      )}

      <div className="my-5" style={{ height: 1, background: "var(--line)" }} />

      <ul className="flex flex-1 flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--ink-2)" }}>
            <Icon.check /> <span>{f}</span>
          </li>
        ))}
        {!full && all.length > features.length && (
          <li className="text-sm" style={{ color: "var(--muted)" }}>+ {all.length - features.length} more included</li>
        )}
      </ul>

      {full && plan.addOnHint && (
        <p className="mt-5 rounded-xl p-3 text-xs" style={{ background: "var(--cream)", color: "var(--ink-2)" }}>{plan.addOnHint}</p>
      )}
      {plan.bestFor && <p className="mt-5 text-xs" style={{ color: "var(--muted)" }}>{plan.bestFor}</p>}

      <div className="mt-5 flex flex-col gap-2.5">
        {/* The CTA is a *customize* invitation ("Customize Basic", "Build Your
            Premium System"), so it opens the builder on this plan. */}
        <Link to={`/builder?plan=${plan.key}`} className={`btn btn-block ${popular || premium ? "btn-primary" : "btn-dark"}`}>{plan.ctaLabel}</Link>
        {!full && <Link to="/plans" className="btn btn-ghost btn-block">View full plan</Link>}
      </div>
    </div>
  );
}

/** Placeholder cards while the catalogue loads — keeps the page from jumping. */
export function LoadingCards({ count = 3, height = 420 }: { count?: number; height?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden className="skeleton" style={{ height, borderRadius: "var(--r-lg)" }} />
      ))}
    </>
  );
}

/** Shown when the catalogue can't be fetched. Never invent prices as a fallback. */
export function LoadError({ message, whatsappText }: { message: string; whatsappText?: string }) {
  return (
    <div className="card p-6 text-center" style={{ background: "var(--paper)" }}>
      <p style={{ color: "var(--ink-2)" }}>{message}</p>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Please refresh the page, or message us and we'll send you the details.</p>
      <a href={waLink(whatsappText ?? "Hi IGNIS, could you send me your plans and prices?")} target="_blank" rel="noreferrer" className="btn btn-wa mt-4">
        <Icon.whatsapp size={18} /> Message us on WhatsApp
      </a>
    </div>
  );
}

export function CTABand({ title, text, primary, whatsappText }: { title: string; text?: string; primary?: { label: string; to: string }; whatsappText?: string }) {
  return (
    <section className="section">
      <div className="container">
        <div className="flex flex-col items-start justify-between gap-6 p-8 sm:p-10 md:flex-row md:items-center" style={{ background: "var(--black)", borderRadius: "var(--r-lg)", color: "#fff" }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(1.4rem,3.5vw,2rem)", color: "#fff" }}>{title}</h3>
            {text && <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,.65)" }}>{text}</p>}
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            {primary && <Link to={primary.to} className="btn btn-primary">{primary.label}</Link>}
            <a href={waLink(whatsappText)} target="_blank" rel="noreferrer" className="btn btn-wa"><Icon.whatsapp size={18} /> Message us on WhatsApp</a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function WhatsAppFab() {
  return (
    <a href={waLink("Hi IGNIS, I'd like to know more about your website plans.")} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"
      style={{ position: "fixed", right: 18, bottom: 18, zIndex: 60, width: 56, height: 56, borderRadius: 999, background: "#25d366", color: "#fff", display: "grid", placeItems: "center", boxShadow: "0 12px 30px -8px rgba(37,211,102,.6)" }}>
      <Icon.whatsapp size={28} />
    </a>
  );
}
