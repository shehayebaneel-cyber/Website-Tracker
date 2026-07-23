import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { Icon } from "./icons";
import { CONTACT, waLink } from "../data/content";

export default function Footer() {
  return (
    <footer style={{ background: "var(--black)", color: "#fff" }}>
      <div className="container" style={{ paddingBlock: 56 }}>
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Logo tagline light />
            <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,.6)", maxWidth: 260 }}>
              Professional websites and business systems for small businesses — built, managed and supported for a simple monthly plan.
            </p>
          </div>

          <FooterCol title="Explore" links={[["Plans", "/plans"], ["Plan Builder", "/builder"], ["Business Systems", "/business-systems"], ["Our Work", "/our-work"], ["How It Works", "/how-it-works"], ["FAQ", "/faq"], ["About", "/about"]]} />
          <FooterCol title="Get help" links={[["Start Your Website", "/start"], ["Client Support", "/support"], ["Client Login", "/login"], ["Contact", "/contact"]]} />

          <div>
            <div className="mb-3 text-sm font-semibold" style={{ fontFamily: "var(--font-display)", letterSpacing: ".04em" }}>Contact</div>
            <div className="flex flex-col gap-2.5 text-sm" style={{ color: "rgba(255,255,255,.72)" }}>
              <a href={waLink()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white"><Icon.whatsapp size={16} /> {CONTACT.whatsapp}</a>
              <a href={`tel:${CONTACT.phone}`} className="inline-flex items-center gap-2 hover:text-white"><span style={{ color: "var(--orange)" }}><Icon.phone /></span> {CONTACT.phone}</a>
              <a href={`mailto:${CONTACT.email}`} className="hover:text-white">{CONTACT.email}</a>
              <span style={{ color: "rgba(255,255,255,.5)" }}>{CONTACT.hours}</span>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs sm:flex-row" style={{ borderColor: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.5)" }}>
          <span>IGNIS · WE BUILD DIGITAL EXPERIENCES</span>
          <div className="flex gap-5">
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <span>© {2026} IGNIS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="mb-3 text-sm font-semibold" style={{ fontFamily: "var(--font-display)", letterSpacing: ".04em" }}>{title}</div>
      <div className="flex flex-col gap-2.5 text-sm" style={{ color: "rgba(255,255,255,.72)" }}>
        {links.map(([label, to]) => <Link key={to} to={to} className="hover:text-white">{label}</Link>)}
      </div>
    </div>
  );
}
