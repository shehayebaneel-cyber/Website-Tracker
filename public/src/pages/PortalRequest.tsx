import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

const STEPS = ["Received", "Being Reviewed", "In Progress", "Completed"];
function stepIndex(friendly: string): number {
  if (friendly === "Received") return 0;
  if (friendly === "Being Reviewed") return 1;
  if (friendly === "Completed" || friendly === "Closed") return 3;
  return 2; // In Progress / Waiting for Your Reply / Waiting for Approval
}
function fmt(v: string) {
  return new Date(v).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

interface Msg { id: string; sender: string; authorName: string | null; body: string; attachments: { name: string; url: string }[]; createdAt: string }
interface Ticket {
  id: string; code: string; summary: string; requestType: string | null; category: string; status: string; rawStatus: string;
  requestedDate: string; completedDate: string | null; businessImpact: string | null; pageUrl: string | null;
  clientConfirmed: boolean; files: { name: string; url: string }[]; messages: Msg[];
}

export default function PortalRequest() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const [t, setT] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api.get<{ ticket: Ticket }>(`/portal/support/${id}`).then((r) => setT(r.ticket)).catch((e) => setError(e.message));
  }
  useEffect(() => { if (!loading && user) load(); /* eslint-disable-next-line */ }, [loading, user, id]);

  if (!loading && !user) return <Navigate to="/login" replace />;
  if (error) return <section className="section"><div className="container" style={{ maxWidth: 680 }}><p style={{ color: "#c0392b" }}>{error}</p><Link to="/portal" style={{ color: "var(--orange)" }}>← Back</Link></div></section>;
  if (!t) return <section className="section"><div className="container" style={{ maxWidth: 680 }}><p className="lead">Loading…</p></div></section>;

  async function send() {
    if (!reply.trim()) return;
    setBusy(true);
    try { const r = await api.post<{ ticket: Ticket }>(`/portal/support/${id}/reply`, { body: reply }); setT(r.ticket); setReply(""); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function confirmFixed() {
    setBusy(true);
    try { const r = await api.post<{ ticket: Ticket }>(`/portal/support/${id}/confirm`, {}); setT(r.ticket); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  const idx = stepIndex(t.status);

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 680 }}>
        <Link to="/portal" className="text-sm" style={{ color: "var(--orange)", fontWeight: 600 }}>← Back to my account</Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="h-section" style={{ fontSize: "1.5rem" }}>{t.summary}</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{t.code} · {t.requestType || t.category}</p>
          </div>
          <span className="pill-tag" style={{ background: idx >= 3 ? "#1a8f5c" : "var(--orange)" }}>{t.status}</span>
        </div>

        {/* Timeline */}
        <div className="card mt-5 p-5">
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 items-center">
                <div className="flex flex-col items-center" style={{ flexShrink: 0 }}>
                  <span className="grid place-items-center" style={{ width: 28, height: 28, borderRadius: 999, background: i <= idx ? "var(--orange)" : "var(--cream)", color: i <= idx ? "#fff" : "var(--muted)", fontSize: "0.75rem", fontWeight: 700 }}>{i < idx ? "✓" : i + 1}</span>
                  <span className="mt-1 text-[10px]" style={{ color: i <= idx ? "var(--ink)" : "var(--muted)" }}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < idx ? "var(--orange)" : "var(--line)", margin: "0 4px" }} />}
              </div>
            ))}
          </div>
          {t.businessImpact && <p className="mt-4 text-sm"><b>Business impact:</b> {t.businessImpact}</p>}
        </div>

        {/* Confirm fixed */}
        {t.rawStatus === "Completed" && !t.clientConfirmed && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4" style={{ background: "#eafaf1", border: "1px solid #bfe6cf" }}>
            <div className="text-sm" style={{ color: "var(--ink-2)" }}>We've marked this done. Is everything working as you wanted?</div>
            <button className="btn btn-primary" style={{ padding: "0.6rem 1rem" }} disabled={busy} onClick={confirmFixed}>Yes, it's fixed ✓</button>
          </div>
        )}
        {t.clientConfirmed && <div className="mt-5 rounded-2xl p-4 text-sm" style={{ background: "#eafaf1", color: "#1a8f5c" }}>✓ You confirmed this is resolved. Thank you!</div>}

        {/* Conversation */}
        <h2 className="mt-8 mb-3" style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 700 }}>Conversation</h2>
        <div className="flex flex-col gap-3">
          {t.messages.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>No messages yet.</p>}
          {t.messages.map((m) => {
            const mine = m.sender === "client";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%] rounded-2xl px-4 py-3" style={{ background: mine ? "var(--orange-soft, #fdece3)" : "var(--cream)", borderTopRightRadius: mine ? 4 : 16, borderTopLeftRadius: mine ? 16 : 4 }}>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{mine ? "You" : (m.authorName?.includes("@") ? "IGNIS" : m.authorName || "IGNIS")} · {fmt(m.createdAt)}</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm">{m.body}</div>
                  {m.attachments?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.attachments.map((a, i) => <a key={i} href={a.url} target="_blank" rel="noreferrer" className="text-xs" style={{ color: "var(--orange)", textDecoration: "underline" }}>{a.name}</a>)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reply */}
        <div className="card mt-4 p-4">
          <textarea className="in" rows={3} placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
          <div className="mt-3 flex justify-end">
            <button className="btn btn-primary" style={{ padding: "0.6rem 1.2rem" }} disabled={busy || !reply.trim()} onClick={send}>{busy ? "Sending…" : "Send reply"}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
