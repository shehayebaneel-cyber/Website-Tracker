import { useState } from "react";
import { api } from "../lib/api";
import { useOptions } from "../lib/useOptions";
import { useClientOptions } from "../lib/useClients";
import type { Expense } from "../lib/types";
import { Modal } from "../components/Modal";
import { Field } from "../components/ui";

function today() { return new Date().toISOString().slice(0, 10); }
function dateInput(v: string | null | undefined) { return v ? new Date(v).toISOString().slice(0, 10) : ""; }

export default function ExpenseForm({
  open, onClose, onSaved, clientId, existing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (e: Expense) => void;
  clientId?: string;
  existing?: Expense | null;
}) {
  const options = useOptions();
  const clients = useClientOptions();
  const [d, setD] = useState<Partial<Expense>>(existing ?? { expenseDate: today(), category: "Software", amount: 0, recurring: false, reimbursementStatus: "Not Applicable", clientId: clientId ?? null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Expense>(k: K, v: Expense[K]) => setD((p) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body: any = {
        expenseDate: d.expenseDate, vendor: d.vendor || null, category: d.category, clientId: d.clientId || null,
        description: d.description || null, amount: d.amount ?? 0, method: d.method || null,
        recurring: !!d.recurring, renewalFrequency: d.recurring ? d.renewalFrequency || null : null,
        nextRenewalDate: d.recurring ? d.nextRenewalDate || null : null,
        reimbursable: !!d.reimbursable, reimbursementStatus: d.reimbursementStatus || "Not Applicable",
        receiptUrl: d.receiptUrl || null, notes: d.notes || null,
      };
      const res = existing
        ? await api.patch<{ expense: Expense }>(`/expenses/${existing.id}`, body)
        : await api.post<{ expense: Expense }>("/expenses", body);
      onSaved(res.expense);
    } catch (e: any) {
      setError(e.message || "Could not save expense");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} wide title={existing ? `Edit ${existing.code}` : "New expense"}
      footer={<>
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy || !d.amount}>{busy ? "Saving…" : existing ? "Save" : "Add expense"}</button>
      </>}>
      {error && <div className="pill pill-crit mb-3 w-full justify-center py-2">{error}</div>}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Date"><input className="input" type="date" value={dateInput(d.expenseDate)} onChange={(e) => set("expenseDate", e.target.value as any)} /></Field>
        <Field label="Amount *"><input className="input tnum" type="number" min={0} step="0.01" value={d.amount ?? 0} onChange={(e) => set("amount", Number(e.target.value))} /></Field>
        <Field label="Category">
          <select className="input" value={d.category ?? "Other"} onChange={(e) => set("category", e.target.value)}>
            {(options.expenseCategory ?? ["Other"]).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Vendor"><input className="input" value={d.vendor ?? ""} onChange={(e) => set("vendor", e.target.value)} /></Field>
        <Field label="Payment method">
          <select className="input" value={d.method ?? ""} onChange={(e) => set("method", e.target.value)}>
            <option value="">—</option>{(options.paymentMethod ?? []).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Client (optional)">
          <select className="input" value={d.clientId ?? ""} onChange={(e) => set("clientId", e.target.value || null)} disabled={!!clientId}>
            <option value="">Business-wide</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.businessName}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description"><input className="input" value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>
        </div>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" checked={!!d.recurring} onChange={(e) => set("recurring", e.target.checked)} />
          <span className="text-sm">Recurring expense</span>
        </label>
        {d.recurring && <>
          <Field label="Renewal frequency">
            <select className="input" value={d.renewalFrequency ?? ""} onChange={(e) => set("renewalFrequency", e.target.value)}>
              <option value="">—</option>{(options.renewalFrequency ?? []).map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Next renewal date"><input className="input" type="date" value={dateInput(d.nextRenewalDate)} onChange={(e) => set("nextRenewalDate", e.target.value as any)} /></Field>
        </>}
      </div>
    </Modal>
  );
}
