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
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Client *">
          <select className="input" value={d.clientId ?? ""} onChange={(e) => { set("clientId", e.target.value); set("websiteId", null); }} disabled={!!clientId}>
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.businessName}</option>)}
          </select>
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
      </div>
      {!d.includedInSubscription && <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>Approved extra work that isn't invoiced yet will show up as an alert until you create/link an invoice for it.</p>}
    </Modal>
  );
}
