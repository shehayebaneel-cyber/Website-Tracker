import { useEffect, useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { Icon } from "../components/icons";

const TYPES = [
  { key: "Technical Bug", label: "Report a problem", hint: "Something isn't working", icon: "bolt" },
  { key: "Update Text", label: "Update text or prices", hint: "Change wording or numbers", icon: "sparkle" },
  { key: "Replace Photos", label: "Change photos", hint: "Swap images or menus", icon: "globe" },
  { key: "Design Change", label: "Design change", hint: "Change how it looks", icon: "store" },
  { key: "New Feature", label: "New feature", hint: "Add something new", icon: "chat" },
  { key: "Other", label: "Something else", hint: "Anything else", icon: "phone" },
];
const PRIORITIES = ["Normal", "Important", "Urgent"];

interface Website { id: string; projectName: string | null; code: string }

export default function PortalNewRequest() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [f, setF] = useState<any>({ requestType: "", priority: "Normal", websiteId: "", files: [] as any[] });
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  useEffect(() => {
    api.get<any>("/portal/me").then((m) => setWebsites(m.websites.map((w: any) => ({ id: w.id, projectName: w.projectName, code: w.code })))).catch(() => {});
  }, []);

  if (!loading && !user) return <Navigate to="/login" replace />;

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true); setError(null);
    try {
      const fd = new FormData();
      Array.from(list).forEach((x) => fd.append("files", x));
      const res = await fetch("/api/public/uploads", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Upload failed");
      set("files", [...f.files, ...d.files]);
    } catch (e: any) { setError(e.message); } finally { setUploading(false); }
  }

  async function submit() {
    setBusy(true); setError(null);
    try {
      const body = { requestType: f.requestType, summary: f.summary, description: f.description || null, priority: f.priority, websiteId: f.websiteId || null, businessImpact: f.priority === "Urgent" ? f.businessImpact : null, files: f.files };
      const r = await api.post<{ id: string }>("/portal/support", body);
      nav(`/portal/request/${r.id}`);
    } catch (e: any) { setError(e.message || "Something went wrong."); } finally { setBusy(false); }
  }

  const canSubmit = f.requestType && f.summary?.trim() && (f.priority !== "Urgent" || f.businessImpact?.trim());

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 680 }}>
        <Link to="/portal" className="text-sm" style={{ color: "var(--orange)", fontWeight: 600 }}>← Back to my account</Link>
        <div className="mt-3">
          <div className="eyebrow mb-1">New request</div>
          <h1 className="h-section">How can we help?</h1>
        </div>

        {error && <div className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: "#fdeceb", color: "#c0392b" }}>{error}</div>}

        <div className="card mt-6 p-6">
          <div className="lbl">What do you need?</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TYPES.map((q) => {
              const on = f.requestType === q.key;
              const Ic = (Icon as any)[q.icon];
              return (
                <button key={q.key} type="button" onClick={() => set("requestType", q.key)} className={`choice ${on ? "on" : ""}`} style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                  <span style={{ color: "var(--orange)" }}>{Ic && <Ic />}</span>
                  <span className="text-sm font-semibold">{q.label}</span>
                  <span className="hint" style={{ marginTop: 0 }}>{q.hint}</span>
                </button>
              );
            })}
          </div>

          <div className="my-6" style={{ height: 1, background: "var(--line)" }} />

          <div className="grid grid-cols-1 gap-4">
            {websites.length > 1 && (
              <label><span className="lbl">Which website?</span>
                <select className="in" value={f.websiteId} onChange={(e) => set("websiteId", e.target.value)}>
                  <option value="">Choose…</option>
                  {websites.map((w) => <option key={w.id} value={w.id}>{w.projectName || w.code}</option>)}
                </select>
              </label>
            )}
            <label><span className="lbl">Short title *</span><input className="in" placeholder="e.g. Update opening hours" value={f.summary ?? ""} onChange={(e) => set("summary", e.target.value)} /></label>
            <label><span className="lbl">Tell us more</span><textarea className="in" rows={4} placeholder="Describe exactly what you need…" value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label>
          </div>

          <div className="mt-6 lbl">How urgent is it?</div>
          <div className="grid grid-cols-3 gap-2">
            {PRIORITIES.map((p) => (
              <button key={p} type="button" onClick={() => set("priority", p)} className={`choice ${f.priority === p ? "on" : ""}`} style={{ justifyContent: "center" }}>{p}</button>
            ))}
          </div>
          {f.priority === "Urgent" && (
            <label className="mt-3 block"><span className="lbl">How is this affecting your business? *</span><textarea className="in" rows={2} value={f.businessImpact ?? ""} onChange={(e) => set("businessImpact", e.target.value)} /></label>
          )}

          <div className="mt-6 lbl">Photos or files (optional)</div>
          <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed p-6 text-center" style={{ borderColor: "var(--line)", background: "var(--cream)" }}>
            <span style={{ color: "var(--orange)" }}><Icon.sparkle /></span>
            <span className="text-sm font-semibold">{uploading ? "Uploading…" : "Tap to add photos, menus or documents"}</span>
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

          <button className="btn btn-primary btn-block mt-7" style={{ padding: "1.05rem" }} onClick={submit} disabled={!canSubmit || busy}>{busy ? "Sending…" : "Send request"}</button>
        </div>
      </div>
    </section>
  );
}
