import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Logo } from "./Logo";
import { useAuth } from "../lib/auth";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/plans", label: "Plans" },
  { to: "/business-systems", label: "Business Systems" },
  { to: "/our-work", label: "Our Work" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/support", label: "Support" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();
  const { user } = useAuth();
  const loggedIn = !!user;

  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${scrolled ? "var(--line)" : "transparent"}`, transition: "border-color .2s" }}
    >
      <div className="container flex items-center justify-between" style={{ height: 72 }}>
        <Link to="/" aria-label="IGNIS home"><Logo /></Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className="text-sm font-medium transition-colors"
              style={({ isActive }) => ({ color: isActive ? "var(--orange)" : "var(--ink-2)", fontFamily: "var(--font-body)" })}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link to={loggedIn ? "/portal" : "/login"} className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>{loggedIn ? "My Account" : "Client Login"}</Link>
          <Link to="/start" className="btn btn-primary" style={{ padding: "0.7rem 1.15rem" }}>Start Your Website</Link>
        </div>

        <button className="lg:hidden" aria-label="Menu" onClick={() => setOpen((v) => !v)}
          style={{ width: 44, height: 44, display: "grid", placeItems: "center" }}>
          <div style={{ width: 22 }}>
            <span style={{ display: "block", height: 2, background: "var(--ink)", borderRadius: 2, marginBottom: 5, transition: "transform .2s", transform: open ? "translateY(7px) rotate(45deg)" : "none" }} />
            <span style={{ display: "block", height: 2, background: "var(--ink)", borderRadius: 2, marginBottom: 5, opacity: open ? 0 : 1, transition: "opacity .2s" }} />
            <span style={{ display: "block", height: 2, background: "var(--ink)", borderRadius: 2, transition: "transform .2s", transform: open ? "translateY(-7px) rotate(-45deg)" : "none" }} />
          </div>
        </button>
      </div>

      {/* Mobile full-screen menu */}
      {open && (
        <div className="lg:hidden" style={{ position: "fixed", inset: "72px 0 0", background: "var(--paper)", zIndex: 40, overflowY: "auto" }}>
          <div className="container flex flex-col gap-1 py-4">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className="rounded-xl px-4 py-4 text-lg font-semibold"
                style={({ isActive }) => ({ fontFamily: "var(--font-display)", color: isActive ? "var(--orange)" : "var(--ink)", background: isActive ? "var(--cream)" : "transparent" })}>
                {n.label}
              </NavLink>
            ))}
            <div className="mt-4 flex flex-col gap-3">
              <Link to="/start" className="btn btn-primary btn-block" style={{ padding: "1.05rem" }}>Start Your Website</Link>
              <Link to="/support" className="btn btn-outline btn-block" style={{ padding: "1.05rem" }}>Existing Client Support</Link>
              <Link to={loggedIn ? "/portal" : "/login"} className="btn btn-ghost btn-block" style={{ padding: "1.05rem" }}>{loggedIn ? "My Account" : "Client Login"}</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
