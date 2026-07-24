import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./icons";
import { waLink } from "../data/content";


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
