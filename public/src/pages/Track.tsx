import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/icons";
import { waLink } from "../data/content";

const STEPS = ["Received", "Being Reviewed", "In Progress", "Completed"];

export default function Track() {
  const [reference, setReference] = useState("");
  const [contact, setContact] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/public/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference, contact }) });
      const d = await res.json(); if (!res.ok) throw new Error(d.error || "Could not find your request.");
      setResult(d);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  const stepIndex = result ? Math.max(0, STEPS.indexOf(result.status === "Waiting for Your Reply" ? "In Progress" : result.status)) : -1;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="text-center">
          <div className="eyebrow mb-2">Track your request</div>
          <h1 className="h-section">Where is my request?</h1>
          <p className="lead mt-3">Enter your reference number and the phone or email you used.</p>
        </div>

        <form onSubmit={submit} className="card mt-8 p-6">
          {error && <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: "#fdeceb", color: "#c0392b" }}>{error}</div>}
          <label className="mb-4 block"><span className="lbl">Reference number</span><input className="in" placeholder="e.g. SUP-202607-001 or APP-202607-001" value={reference} onChange={(e) => setReference(e.target.value)} required /></label>
          <label className="mb-4 block"><span className="lbl">Email or phone</span><input className="in" value={contact} onChange={(e) => setContact(e.target.value)} required /></label>
          <button className="btn btn-primary btn-block" style={{ padding: "1rem" }} disabled={busy}>{busy ? "Checking…" : "Track request"}</button>
          <p className="hint text-center">For your privacy, we only show details after your contact matches the request.</p>
        </form>

        {result && (
          <div className="card mt-6 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>{result.reference}</div>
                <div className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>{result.summary}</div>
              </div>
              <span className="pill-tag" style={{ background: "var(--orange)" }}>{result.status}</span>
            </div>
            <div className="mt-6 flex items-center">
              {STEPS.map((s, i) => (
                <div key={s} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center" style={{ flexShrink: 0 }}>
                    <span className="grid place-items-center" style={{ width: 28, height: 28, borderRadius: 999, background: i <= stepIndex ? "var(--orange)" : "var(--cream)", color: i <= stepIndex ? "#fff" : "var(--muted)", fontSize: "0.75rem", fontWeight: 700 }}>{i < stepIndex ? "✓" : i + 1}</span>
                    <span className="mt-1 text-[10px]" style={{ color: i <= stepIndex ? "var(--ink)" : "var(--muted)" }}>{s}</span>
                  </div>
                  {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < stepIndex ? "var(--orange)" : "var(--line)", margin: "0 4px" }} />}
                </div>
              ))}
            </div>
            <a href={waLink(`Hi IGNIS, an update on ${result.reference}?`)} target="_blank" rel="noreferrer" className="btn btn-wa btn-block mt-6"><Icon.whatsapp size={18} /> Ask for an update</a>
          </div>
        )}

        <p className="mt-6 text-center text-sm" style={{ color: "var(--muted)" }}>Need to send a new request? <Link to="/support" style={{ color: "var(--orange)", fontWeight: 600 }}>Client Support</Link></p>
      </div>
    </section>
  );
}
