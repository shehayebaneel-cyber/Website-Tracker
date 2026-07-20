import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useOptions } from "../lib/useOptions";
import { useClientOptions } from "../lib/useClients";
import type { Ticket, Website, Paged } from "../lib/types";
import { Modal } from "../components/Modal";
import { Field } from "../components/ui";

function dateInput(v: string | null | undefined) { return v ? new Date(v).toISOString().slice(0, 10) : ""; }

export default function TicketForm({
  open, onClose, onSaved, clientId, existing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (t: Ticket) => void;
  clientId?: string;
  existing?: Ticket | null;
}) {
  const options = useOptions();
  const clients = useClientOptions();
  const [d, setD] = useState<Partial<Ticket>>(existing ?? {
    clientId: clientId ?? "", category: "Content Change", priority: "Medium", status: "Not Started",
    includedInSubscription: true, hoursSpent: 0, extraCharge: 0, requestSource: "WhatsApp",
  });
  const [websites, setWebsites] = useState<Website[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Ticket>(k: K, v: Ticket[K]) => setD((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!d.clientId) { setWebsites([]); return; }
    api.get<Paged<Website>>(`/websites?clientId=${d.clientId}&pageSize=200`).then((r) => setWebsites(r.items)).catch(() => {});
  }, [d.clientId]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body: any = {
        clientId: d.clientId, websiteId: d.websiteId || null, requestSource: d.requestSource || null,
        category: d.category, summary: d.summary, priority: d.priority, status: d.status,
        assignedTo: d.assignedTo || null, dueDate: d.dueDate || null,
        hoursSpent: d.hoursSpent ?? 0, includedInSubscription: !!d.includedInSubscription,
        extraCharge: d.includedInSubscription ? 0 : d.extraCharge ?? 0, clientApproved: !!d.clientApproved,
        requestLink: d.requestLink || null, notes: d.notes || null,
      };
      const res = existing
        ? await api.patch<{ ticket: Ticket }>(`/support/${existing.id}`, body)
        : await api.post<{ ticket: Ticket }>("/support", body);
      onSaved(res.ticket);
    } catch (e: any) {
      setError(e.message || "Could not save ticket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} wide title={existing ? `Edit ${existing.code}` : "New support ticket"}
      footer={<>
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy || !d.clientId || !d.summary}>{busy ? "Saving…" : existing ? "Save" : "Create ticket"}</button>
      </>}>
      {error && <div className="pill pill-crit mb-3 w-full justify-center py-2">{error}</div>}
      {existing?.fromWebsite && <IntakePanel t={existing} />}
      {existing && <ThreadPanel ticketId={existing.id} />}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Client *">
          <select className="input" value={d.clientId ?? ""} onChange={(e) => { set("clientId", e.target.value); set("websiteId", null); }} disabled={!!clientId}>
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.businessName}</option>)}
          </select>
          {existing?.unlinked && <p className="mt-1 text-xs" style={{ color: "var(--attn, #c26a1b)" }}>From the website — pick the matching client to link this request.</p>}
        </Field>
        <Field label="Website (optional)">
          <select className="input" value={d.websiteId ?? ""} onChange={(e) => set("websiteId", e.target.value || null)}>
            <option value="">—</option>
            {websites.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.projectName || ""}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Request summary *"><input className="input" value={d.summary ?? ""} onChange={(e) => set("summary", e.target.value)} /></Field>
        </div>
        <Field label="Category">
          <select className="input" value={d.category ?? "Other"} onChange={(e) => set("category", e.target.value)}>
            {(options.supportCategory ?? ["Other"]).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Source">
          <select className="input" value={d.requestSource ?? ""} onChange={(e) => set("requestSource", e.target.value)}>
            {(options.requestSource ?? ["WhatsApp"]).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className="input" value={d.priority ?? "Medium"} onChange={(e) => set("priority", e.target.value)}>
            {(options.priority ?? ["Medium"]).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className="input" value={d.status ?? "Not Started"} onChange={(e) => set("status", e.target.value)}>
            {(options.supportStatus ?? ["Not Started"]).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Assigned to"><input className="input" value={d.assignedTo ?? ""} onChange={(e) => set("assignedTo", e.target.value)} /></Field>
        <Field label="Due date"><input className="input" type="date" value={dateInput(d.dueDate)} onChange={(e) => set("dueDate", e.target.value as any)} /></Field>
        <Field label="Hours spent"><input className="input tnum" type="number" min={0} step="0.25" value={d.hoursSpent ?? 0} onChange={(e) => set("hoursSpent", Number(e.target.value))} /></Field>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!d.includedInSubscription} onChange={(e) => set("includedInSubscription", e.target.checked)} />
          <span className="text-sm">Included in subscription</span>
        </label>
        {!d.includedInSubscription && <>
          <Field label="Extra charge"><input className="input tnum" type="number" min={0} step="0.01" value={d.extraCharge ?? 0} onChange={(e) => set("extraCharge", Number(e.target.value))} /></Field>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!d.clientApproved} onChange={(e) => set("clientApproved", e.target.checked)} />
            <span className="text-sm">Client approved the extra charge</span>
          </label>
        </>}
        <div className="sm:col-span-2">
          <Field label={existing?.fromWebsite ? "Description & internal notes" : "Notes"}>
            <textarea className="input" rows={3} value={d.notes ?? ""} onChange={(e) => set("notes", e.target.value)}
              placeholder={existing?.fromWebsite ? "What the client wrote, plus any internal notes…" : "Internal notes…"} />
          </Field>
        </div>
      </div>
      {!d.includedInSubscription && <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>Approved extra work that isn't invoiced yet will show up as an alert until you create/link an invoice for it.</p>}
    </Modal>
  );
}

function ThreadPanel({ ticketId }: { ticketId: string }) {
  const [data, setData] = useState<{ messages: any[]; clientConfirmed: boolean } | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get<{ messages: any[]; clientConfirmed: boolean }>(`/support/${ticketId}/thread`).then(setData).catch(() => {}); }, [ticketId]);
  async function send() {
    if (!reply.trim()) return;
    setBusy(true);
    try { const r = await api.post<{ messages: any[] }>(`/support/${ticketId}/reply`, { body: reply }); setData((d) => ({ clientConfirmed: d?.clientConfirmed ?? false, messages: r.messages })); setReply(""); }
    finally { setBusy(false); }
  }
  if (!data) return null;
  return (
    <div className="mb-4 rounded-lg p-4" style={{ border: "1px solid var(--line)", background: "var(--surface-2, rgba(0,0,0,0.02))" }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">Conversation with the client</span>
        {data.clientConfirmed && <span className="pill pill-good">Client confirmed fixed ✓</span>}
      </div>
      {data.messages.length === 0 ? <p className="text-xs" style={{ color: "var(--muted)" }}>No messages yet.</p> : (
        <div className="flex flex-col gap-2">
          {data.messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === "team" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid var(--line)", background: m.sender === "team" ? "var(--surface-2)" : "transparent" }}>
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>{m.sender === "team" ? "You" : "Client"} · {new Date(m.createdAt).toLocaleString()}</div>
                <div className="mt-0.5 whitespace-pre-wrap">{m.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <input className="input" placeholder="Reply to the client…" value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
        <button className="btn btn-primary" style={{ padding: "0.4rem 0.9rem", whiteSpace: "nowrap" }} disabled={busy || !reply.trim()} onClick={send}>Send</button>
      </div>
    </div>
  );
}

const isImage = (type?: string) => !!type && type.startsWith("image/");

function IntakePanel({ t }: { t: Ticket }) {
  const rows: [string, string | null | undefined][] = [
    ["Request type", t.requestType],
    ["Business", t.requesterBusiness],
    ["Contact name", t.requesterName],
    ["Phone", t.requesterPhone],
    ["Email", t.requesterEmail],
    ["Website", t.requesterWebsite],
    ["Page / section", t.pageUrl],
    ["Device", t.deviceInfo],
    ["When it started", t.problemStarted],
    ["How often", t.frequency],
    ["Steps / what to change", t.stepsToReproduce],
  ];
  const shown = rows.filter(([, v]) => v && String(v).trim());
  const files = t.files ?? [];

  return (
    <div className="mb-4 rounded-lg p-4" style={{ border: "1px solid var(--line)", background: "var(--surface-2, rgba(0,0,0,0.02))" }}>
      <div className="mb-2 flex items-center gap-2">
        <span className="pill">Website</span>
        <span className="text-sm font-semibold">Submitted from the website</span>
      </div>

      {t.businessImpact && (
        <div className="mb-3 rounded-md px-3 py-2 text-sm" style={{ background: "rgba(194,106,27,0.10)", color: "var(--attn, #c26a1b)" }}>
          <span className="font-semibold">Business impact:</span> {t.businessImpact}
        </div>
      )}

      <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {shown.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <dt className="text-xs" style={{ color: "var(--muted)" }}>{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>

      {files.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-xs" style={{ color: "var(--muted)" }}>Attachments</div>
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <a key={i} href={f.url} target="_blank" rel="noreferrer" title={f.name}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs" style={{ border: "1px solid var(--line)" }}>
                {isImage(f.type)
                  ? <img src={f.url} alt={f.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
                  : <span style={{ fontSize: 18 }}>📎</span>}
                <span className="max-w-[140px] truncate">{f.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
