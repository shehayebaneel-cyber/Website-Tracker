import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/icons";
import { waLink, CONTACT } from "../data/content";

const QUICK = [
  { key: "Technical Bug", label: "Report a problem", hint: "Something isn't working", icon: "bolt" },
  { key: "Update Text", label: "Request an update", hint: "Change text, price or photos", icon: "sparkle" },
  { key: "Design Change", label: "Design change", hint: "Change how it looks", icon: "globe" },
  { key: "New Feature", label: "New feature", hint: "Add something new", icon: "store" },
  { key: "Billing Question", label: "Billing question", hint: "Ask about payments", icon: "chat" },
  { key: "Other", label: "General question", hint: "Anything else", icon: "phone" },
];

const TYPES = ["Website Not Opening", "Technical Bug", "Mobile Display Problem", "Booking Problem", "Order Problem", "Payment Problem", "Login Problem", "Incorrect Information", "Update Text", "Update Price", "Add or Remove Service", "Add or Remove Product", "Replace Photos", "Design Change", "New Page", "New Feature", "Domain or Email Problem", "Billing Question", "Other"];

const PRIORITIES = [
  { key: "Normal", title: "Normal", hint: "A small update or question. The website still works." },
  { key: "Important", title: "Important", hint: "A feature isn't working right, but I can still operate." },
  { key: "Urgent", title: "Urgent", hint: "My website / booking / store / payment is down and I can't operate." },
];

export default function Support() {
  const [f, setF] = useState<any>({ requestType: "", priority: "Normal", files: [] as any[] });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string } | null>(null);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const isDesign = f.requestType === "Design Change";
  const isUpdate = ["Update Text", "Update Price", "Add or Remove Service", "Add or Remove Product", "Replace Photos", "Incorrect Information"].includes(f.requestType);
  const isBug = ["Website Not Opening", "Technical Bug", "Mobile Display Problem", "Booking Problem", "Order Problem", "Payment Problem", "Login Problem"].includes(f.requestType);

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true); setError(null);
    try {
      const fd = new FormData(); Array.from(list).forEach((x) => fd.append("files", x));
      const res = await fetch("/api/public/uploads", { method: "POST", body: fd });
      const d = await res.json(); if (!res.ok) throw new Error(d.error || "Upload failed");
      set("files", [...f.files, ...d.files]);
    } catch (e: any) { setError(e.message); } finally { setUploading(false); }
  }

  async function submit() {
    setBusy(true); setError(null);
    try {
      const body = { ...f, deviceInfo: f.deviceInfo, browserInfo: navigator.userAgent.slice(0, 120) };
      const res = await fetch("/api/public/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json(); if (!res.ok) throw new Error(d.error || "Something went wrong.");
      setDone({ reference: d.reference });
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  const canSubmit = f.requestType && f.summary?.trim() && f.requesterBusiness?.trim() && (f.requesterPhone?.trim() || f.requesterEmail?.trim()) && (f.priority !== "Urgent" || f.businessImpact?.trim());

  if (done) return <Confirmation reference={done.reference} urgent={f.priority === "Urgent"} />;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="text-center">
          <div className="eyebrow mb-2">Client support</div>
          <h1 className="h-section">How can we help?</h1>
          <p className="lead mt-3">Tell us what you need and we'll take care of it. Already a client? We'll match your request to your website automatically.</p>
        </div>

        {/* Emergency */}
        <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-2xl p-4 sm:flex-row sm:items-center" style={{ background: "#fff4f0", border: "1px solid #f6c9b6" }}>
          <div className="text-sm" style={{ color: "var(--ink-2)" }}>
            <b style={{ color: "var(--orange-deep)" }}>Website completely down?</b> Mark your request <b>Urgent</b> below, or reach us directly.
          </div>
          <a href={waLink("URGENT: my website is down.")} target="_blank" rel="noreferrer" className="btn btn-wa" style={{ padding: "0.6rem 1rem" }}><Icon.whatsapp size={16} /> Emergency WhatsApp</a>
        </div>

        {error && <div className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: "#fdeceb", color: "#c0392b" }}>{error}</div>}

        <div className="card mt-6 p-6 sm:p-8">
          {/* Quick options */}
          <div className="lbl">What do you need?</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {QUICK.map((q) => {
              const on = f.requestType === q.key || (q.key === "Update Text" && isUpdate) || (q.key === "Technical Bug" && isBug);
              const Ic = (Icon as any)[q.icon];
              return (
                <button key={q.key} type="button" onClick={() => set("requestType", q.key)} className={`choice ${on ? "on" : ""}`} style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                  <span style={{ color: "var(--orange)" }}><Ic /></span>
                  <span className="text-sm font-semibold">{q.label}</span>
                  <span className="hint" style={{ marginTop: 0 }}>{q.hint}</span>
                </button>
              );
            })}
          </div>

          <div className="my-6" style={{ height: 1, background: "var(--line)" }} />

          {/* Identity */}
          <div className="lbl">Your details</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <F label="Business name *"><input className="in" value={f.requesterBusiness ?? ""} onChange={(e) => set("requesterBusiness", e.target.value)} /></F>
            <F label="Website URL"><input className="in" placeholder="yourbusiness.com" value={f.requesterWebsite ?? ""} onChange={(e) => set("requesterWebsite", e.target.value)} /></F>
            <F label="Phone"><input className="in" value={f.requesterPhone ?? ""} onChange={(e) => set("requesterPhone", e.target.value)} /></F>
            <F label="Email"><input className="in" type="email" value={f.requesterEmail ?? ""} onChange={(e) => set("requesterEmail", e.target.value)} /></F>
            <F label="Client ID (if you know it)"><input className="in" placeholder="e.g. C001" value={f.clientCode ?? ""} onChange={(e) => set("clientCode", e.target.value)} /></F>
          </div>
          <p className="hint">Enter your phone or email so we can update you and you can track your request.</p>

          <div className="my-6" style={{ height: 1, background: "var(--line)" }} />

          {/* Request */}
          <div className="lbl">Your request</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <F label="Request type *"><select className="in" value={f.requestType} onChange={(e) => set("requestType", e.target.value)}><option value="">Choose…</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></F>
            <F label="Short title *"><input className="in" placeholder="e.g. Update opening hours" value={f.summary ?? ""} onChange={(e) => set("summary", e.target.value)} /></F>
            <F label="Full description" full><textarea className="in" rows={4} placeholder="Tell us exactly what you need…" value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} /></F>

            {isUpdate && <>
              <F label="Where should it appear? (page/section)"><input className="in" value={f.pageUrl ?? ""} onChange={(e) => set("pageUrl", e.target.value)} /></F>
              <F label="Exact new content" full><textarea className="in" rows={2} placeholder="Current text → new text, current price → new price…" value={f.stepsToReproduce ?? ""} onChange={(e) => set("stepsToReproduce", e.target.value)} /></F>
            </>}

            {isBug && <>
              <F label="Which page has the problem?"><input className="in" value={f.pageUrl ?? ""} onChange={(e) => set("pageUrl", e.target.value)} /></F>
              <F label="Device used"><select className="in" value={f.deviceInfo ?? ""} onChange={(e) => set("deviceInfo", e.target.value)}><option value="">Choose…</option>{["Phone", "Tablet", "Computer"].map((o) => <option key={o}>{o}</option>)}</select></F>
              <F label="When did it start?"><input className="in" value={f.problemStarted ?? ""} onChange={(e) => set("problemStarted", e.target.value)} /></F>
              <F label="How often does it happen?"><select className="in" value={f.frequency ?? ""} onChange={(e) => set("frequency", e.target.value)}><option value="">Choose…</option>{["Every time", "Sometimes", "Once"].map((o) => <option key={o}>{o}</option>)}</select></F>
              <F label="Steps that cause it" full><textarea className="in" rows={2} value={f.stepsToReproduce ?? ""} onChange={(e) => set("stepsToReproduce", e.target.value)} /></F>
            </>}

            {isDesign && <>
              <F label="Which page or section?"><input className="in" value={f.pageUrl ?? ""} onChange={(e) => set("pageUrl", e.target.value)} /></F>
              <F label="Reference example (link)"><input className="in" placeholder="A site you like…" value={f.requestLink ?? ""} onChange={(e) => set("requestLink", e.target.value)} /></F>
              <F label="What do you want changed?" full><textarea className="in" rows={2} value={f.stepsToReproduce ?? ""} onChange={(e) => set("stepsToReproduce", e.target.value)} /></F>
              <div className="sm:col-span-2 rounded-xl p-3 text-sm" style={{ background: "var(--cream)", color: "var(--muted)" }}>Small adjustments are usually included. Major redesigns may be quoted separately — we'll always tell you first.</div>
            </>}
          </div>

          {/* Priority */}
          <div className="mt-6 lbl">How urgent is it?</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PRIORITIES.map((p) => (
              <button key={p.key} type="button" onClick={() => set("priority", p.key)} className={`choice ${f.priority === p.key ? "on" : ""}`} style={{ flexDirection: "column", alignItems: "flex-start" }}>
                <span className="text-sm font-semibold">{p.title}</span>
                <span className="hint" style={{ marginTop: 0 }}>{p.hint}</span>
              </button>
            ))}
          </div>
          {f.priority === "Urgent" && (
            <F label="How is this affecting your business? *"><textarea className="in mt-2" rows={2} placeholder="e.g. We can't take any orders or bookings right now." value={f.businessImpact ?? ""} onChange={(e) => set("businessImpact", e.target.value)} /></F>
          )}

          {/* Attachments */}
          <div className="mt-6 lbl">Screenshots or files (optional)</div>
          <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed p-6 text-center" style={{ borderColor: "var(--line)", background: "var(--cream)" }}>
            <span style={{ color: "var(--orange)" }}><Icon.sparkle /></span>
            <span className="text-sm font-semibold">{uploading ? "Uploading…" : "Tap to add screenshots or a screen recording"}</span>
            <span className="hint" style={{ marginTop: 0 }}>Images, video, PDF, Word or Excel · up to 15 MB each</span>
            <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,video/*" style={{ display: "none" }} onChange={(e) => onFiles(e.target.files)} />
          </label>
          {f.files.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {f.files.map((x: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: "var(--cream)" }}>
                  <span className="truncate">{x.name}</span>
                  <button onClick={() => set("files", f.files.filter((_: any, j: number) => j !== i))} style={{ color: "var(--muted)" }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-primary btn-block mt-7" style={{ padding: "1.05rem" }} onClick={submit} disabled={!canSubmit || busy}>{busy ? "Submitting…" : "Submit request"}</button>
        </div>

        <p className="mt-4 text-center text-sm" style={{ color: "var(--muted)" }}>
          Already submitted? <Link to="/track" style={{ color: "var(--orange)", fontWeight: 600 }}>Track your request</Link> · or WhatsApp us at {CONTACT.whatsapp}
        </p>
      </div>
    </section>
  );
}

function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <label className={full ? "sm:col-span-2" : ""}><span className="lbl">{label}</span>{children}</label>;
}

function Confirmation({ reference, urgent }: { reference: string; urgent: boolean }) {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 620, textAlign: "center" }}>
        <div className="mx-auto grid place-items-center" style={{ width: 72, height: 72, borderRadius: 999, background: "var(--orange-soft)", color: "var(--orange)" }}><Icon.check /></div>
        <h1 className="h-section mt-5">Your request has been received</h1>
        <p className="lead mt-3">Thank you — our team will {urgent ? "look at this as soon as possible" : "get back to you within 1–2 business days"}.</p>
        <div className="mt-6 inline-flex flex-col items-center rounded-2xl px-8 py-5" style={{ background: "var(--cream)" }}>
          <span className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}>Your ticket number</span>
          <span className="mt-1 text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--orange)" }}>{reference}</span>
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/track" className="btn btn-primary">Track this request</Link>
          <a href={waLink(`Hi IGNIS, about my request ${reference}.`)} target="_blank" rel="noreferrer" className="btn btn-wa"><Icon.whatsapp size={18} /> Message us</a>
        </div>
      </div>
    </section>
  );
}
