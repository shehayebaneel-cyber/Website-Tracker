import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useOptions } from "../../lib/useOptions";
import type { Lead, Salesperson } from "../../lib/salesTypes";
import { Modal } from "../../components/Modal";
import { Field } from "../../components/ui";

export default function LeadForm({
  open, onClose, onSaved, isAdmin, existing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (l: Lead) => void;
  isAdmin: boolean;
  existing?: Lead | null;
}) {
  const options = useOptions();
  const [d, setD] = useState<Partial<Lead>>(existing ?? { status: "New", source: "Door-to-door" });
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [dupes, setDupes] = useState<Lead[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Lead>(k: K, v: Lead[K]) => { setD((p) => ({ ...p, [k]: v })); setConfirmed(false); setDupes([]); };

  useEffect(() => {
    if (isAdmin) api.get<{ items: Salesperson[] }>("/salespeople").then((r) => setSalespeople(r.items.filter((s) => s.status === "Active"))).catch(() => {});
  }, [isAdmin]);

  async function save() {
    setBusy(true); setError(null);
    try {
      // duplicate check first (unless already confirmed on a prior click)
      if (!existing && !confirmed) {
        const { duplicates } = await api.post<{ duplicates: Lead[] }>("/leads/check-duplicate", {
          businessName: d.businessName, phone: d.phone, whatsapp: d.whatsapp, instagram: d.instagram, existingWebsite: d.existingWebsite,
        });
        if (duplicates.length > 0) { setDupes(duplicates); setConfirmed(true); setBusy(false); return; }
      }
      const body: any = { ...d };
      const res = existing
        ? await api.patch<{ lead: Lead }>(`/leads/${existing.id}`, body)
        : await api.post<{ lead: Lead }>("/leads", body);
      onSaved(res.lead);
    } catch (e: any) {
      setError(e.message || "Could not save lead");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} wide title={existing ? `Edit ${existing.code}` : "New lead"}
      footer={<>
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy || !d.businessName}>
          {busy ? "Saving…" : confirmed && dupes.length ? "Save anyway" : existing ? "Save" : "Create lead"}
        </button>
      </>}>
      {error && <div className="pill pill-crit mb-3 w-full justify-center py-2">{error}</div>}
      {dupes.length > 0 && (
        <div className="mb-3 rounded-lg border p-3" style={{ borderColor: "var(--warn-line)", background: "var(--warn-bg)" }}>
          <div className="mb-1 text-sm font-semibold" style={{ color: "var(--warn)" }}>Possible duplicate{dupes.length > 1 ? "s" : ""} found</div>
          {dupes.map((x) => <div key={x.id} className="text-xs" style={{ color: "var(--ink-2)" }}>{x.code} · {x.businessName} {x.salespersonName ? `(${x.salespersonName})` : ""} — {x.status}</div>)}
          <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Click “Save anyway” to add it regardless.</div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Business name *"><input className="input" value={d.businessName ?? ""} onChange={(e) => set("businessName", e.target.value)} /></Field>
        <Field label="Contact person"><input className="input" value={d.contactPerson ?? ""} onChange={(e) => set("contactPerson", e.target.value)} /></Field>
        <Field label="Phone"><input className="input" value={d.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="WhatsApp"><input className="input" value={d.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
        <Field label="Instagram"><input className="input" value={d.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} /></Field>
        <Field label="Email"><input className="input" value={d.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="City"><input className="input" value={d.city ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label="Category"><input className="input" value={d.category ?? ""} onChange={(e) => set("category", e.target.value)} /></Field>
        <Field label="Existing website"><input className="input" value={d.existingWebsite ?? ""} onChange={(e) => set("existingWebsite", e.target.value)} /></Field>
        <Field label="Source">
          <select className="input" value={d.source ?? ""} onChange={(e) => set("source", e.target.value)}>
            <option value="">—</option>{(options.leadSource ?? []).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className="input" value={d.status ?? "New"} onChange={(e) => set("status", e.target.value)}>
            {(options.leadStatus ?? ["New"]).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Interested service"><input className="input" value={d.interestedService ?? ""} onChange={(e) => set("interestedService", e.target.value)} /></Field>
        <Field label="Proposed monthly ($)"><input className="input tnum" type="number" min={0} step="0.01" value={d.proposedMonthly ?? ""} onChange={(e) => set("proposedMonthly", e.target.value === "" ? null : Number(e.target.value))} /></Field>
        <Field label="Proposed setup ($)"><input className="input tnum" type="number" min={0} step="0.01" value={d.proposedSetup ?? ""} onChange={(e) => set("proposedSetup", e.target.value === "" ? null : Number(e.target.value))} /></Field>
        <Field label="Close chance (%)"><input className="input tnum" type="number" min={0} max={100} value={d.closeChance ?? ""} onChange={(e) => set("closeChance", e.target.value === "" ? null : Number(e.target.value))} /></Field>
        <Field label="Next follow-up"><input className="input" type="date" value={d.nextFollowUpDate ? new Date(d.nextFollowUpDate).toISOString().slice(0, 10) : ""} onChange={(e) => set("nextFollowUpDate", (e.target.value || null) as any)} /></Field>
        {isAdmin && (
          <Field label="Assign to salesperson *">
            <select className="input" value={(d as any).salespersonId ?? ""} onChange={(e) => set("salespersonId" as any, e.target.value as any)}>
              <option value="">Select…</option>
              {salespeople.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.fullName}</option>)}
            </select>
          </Field>
        )}
        <div className="sm:col-span-2"><Field label="Notes"><textarea className="input" rows={2} value={d.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field></div>
      </div>
    </Modal>
  );
}
