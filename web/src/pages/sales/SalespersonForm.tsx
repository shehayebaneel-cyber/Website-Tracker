import { useState } from "react";
import { api } from "../../lib/api";
import { useOptions } from "../../lib/useOptions";
import type { Salesperson } from "../../lib/salesTypes";
import { Modal } from "../../components/Modal";
import { Field } from "../../components/ui";

export default function SalespersonForm({
  open, onClose, onSaved, existing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (s: Salesperson) => void;
  existing?: Salesperson | null;
}) {
  const options = useOptions();
  const [d, setD] = useState<any>(existing ?? { status: "Active", commissionMethod: "Fixed", commissionAmount: 5, commissionPercent: 25 });
  const [makeLogin, setMakeLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: any) => setD((p: any) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true); setError(null);
    try {
      const body: any = {
        fullName: d.fullName, phone: d.phone || null, email: d.email || null, city: d.city || null,
        startDate: d.startDate || null, status: d.status, commissionMethod: d.commissionMethod,
        commissionAmount: Number(d.commissionAmount ?? 5), commissionPercent: Number(d.commissionPercent ?? 25),
        paymentMethod: d.paymentMethod || null, whishNumber: d.whishNumber || null, bankInfo: d.bankInfo || null, notes: d.notes || null,
      };
      if (!existing && makeLogin && d.loginEmail && d.loginPassword) { body.loginEmail = d.loginEmail; body.loginPassword = d.loginPassword; }
      const res = existing
        ? await api.patch<{ salesperson: Salesperson }>(`/salespeople/${existing.id}`, body)
        : await api.post<{ salesperson: Salesperson }>("/salespeople", body);
      onSaved(res.salesperson);
    } catch (e: any) { setError(e.message || "Could not save"); } finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} wide title={existing ? `Edit ${existing.code}` : "New salesperson"}
      footer={<>
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy || !d.fullName}>{busy ? "Saving…" : existing ? "Save" : "Create"}</button>
      </>}>
      {error && <div className="pill pill-crit mb-3 w-full justify-center py-2">{error}</div>}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Full name *"><input className="input" value={d.fullName ?? ""} onChange={(e) => set("fullName", e.target.value)} /></Field>
        <Field label="Phone"><input className="input" value={d.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Email"><input className="input" value={d.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="City / territory"><input className="input" value={d.city ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label="Start date"><input className="input" type="date" value={d.startDate ? new Date(d.startDate).toISOString().slice(0, 10) : ""} onChange={(e) => set("startDate", e.target.value)} /></Field>
        <Field label="Status">
          <select className="input" value={d.status} onChange={(e) => set("status", e.target.value)}>
            {(options.salespersonStatus ?? ["Active"]).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Commission method">
          <select className="input" value={d.commissionMethod} onChange={(e) => set("commissionMethod", e.target.value)}>
            <option value="Fixed">Fixed amount</option>
            <option value="Percentage">Percentage</option>
          </select>
        </Field>
        {d.commissionMethod === "Fixed"
          ? <Field label="Commission ($/paid month)"><input className="input tnum" type="number" min={0} step="0.01" value={d.commissionAmount} onChange={(e) => set("commissionAmount", e.target.value)} /></Field>
          : <Field label="Commission (%)"><input className="input tnum" type="number" min={0} max={100} step="0.5" value={d.commissionPercent} onChange={(e) => set("commissionPercent", e.target.value)} /></Field>}
        <Field label="Payment method">
          <select className="input" value={d.paymentMethod ?? ""} onChange={(e) => set("paymentMethod", e.target.value)}>
            <option value="">—</option>{(options.paymentMethod ?? []).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Whish number"><input className="input" value={d.whishNumber ?? ""} onChange={(e) => set("whishNumber", e.target.value)} /></Field>
        <div className="sm:col-span-2"><Field label="Notes"><textarea className="input" rows={2} value={d.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field></div>
      </div>

      {!existing && (
        <div className="mt-4 rounded-lg border p-3" style={{ borderColor: "var(--line)" }}>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={makeLogin} onChange={(e) => setMakeLogin(e.target.checked)} />
            <span className="text-sm font-medium">Create a login for this salesperson (portal access)</span>
          </label>
          {makeLogin && (
            <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Login email"><input className="input" type="email" value={d.loginEmail ?? ""} onChange={(e) => set("loginEmail", e.target.value)} /></Field>
              <Field label="Temporary password (min 8)"><input className="input" type="password" value={d.loginPassword ?? ""} onChange={(e) => set("loginPassword", e.target.value)} /></Field>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
