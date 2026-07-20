import { useState } from "react";
import { api } from "../lib/api";
import { useOptions } from "../lib/useOptions";
import type { Client } from "../lib/types";
import { Modal } from "../components/Modal";
import { Field } from "../components/ui";

type Draft = Partial<Client>;

function dateInput(v: string | null | undefined): string {
  if (!v) return "";
  return new Date(v).toISOString().slice(0, 10);
}

export default function ClientForm({
  open,
  onClose,
  onSaved,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (c: Client) => void;
  existing?: Client | null;
}) {
  const options = useOptions();
  const [d, setD] = useState<Draft>(existing ?? { status: "Active", monthlyFee: 0, billingDay: 1 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setD((prev) => ({ ...prev, [k]: v }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = {
        businessName: d.businessName,
        contactName: d.contactName || null,
        phone: d.phone || null,
        website: d.website || null,
        city: d.city || null,
        subscriptionStartDate: d.subscriptionStartDate || null,
        billingDay: d.billingDay ?? null,
        monthlyFee: d.monthlyFee ?? 0,
        servicePlan: d.servicePlan || null,
        status: d.status || "Active",
        paymentMethod: d.paymentMethod || null,
        notes: d.notes || null,
      };
      const res = existing
        ? await api.patch<{ client: Client }>(`/clients/${existing.id}`, body)
        : await api.post<{ client: Client }>("/clients", body);
      onSaved(res.client);
    } catch (e: any) {
      setError(e.message || "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={existing ? `Edit ${existing.code}` : "New client"}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy || !d.businessName}>
            {busy ? "Saving…" : existing ? "Save changes" : "Create client"}
          </button>
        </>
      }
    >
      {error && <div className="pill pill-crit mb-3 w-full justify-center py-2">{error}</div>}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Business name *">
          <input className="input" value={d.businessName ?? ""} onChange={(e) => set("businessName", e.target.value)} />
        </Field>
        <Field label="Contact name">
          <input className="input" value={d.contactName ?? ""} onChange={(e) => set("contactName", e.target.value)} />
        </Field>
        <Field label="Phone">
          <input className="input" value={d.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="City">
          <input className="input" value={d.city ?? ""} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="Website / main link">
          <input className="input" value={d.website ?? ""} onChange={(e) => set("website", e.target.value)} />
        </Field>
        <Field label="Service plan">
          <select className="input" value={d.servicePlan ?? ""} onChange={(e) => set("servicePlan", e.target.value)}>
            <option value="">—</option>
            {(options.servicePlan ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Monthly fee">
          <input className="input tnum" type="number" min={0} step="0.01" value={d.monthlyFee ?? 0} onChange={(e) => set("monthlyFee", Number(e.target.value))} />
        </Field>
        <Field label="Billing day (1–31)">
          <input className="input tnum" type="number" min={1} max={31} value={d.billingDay ?? ""} onChange={(e) => set("billingDay", e.target.value ? Number(e.target.value) : null)} />
        </Field>
        <Field label="Subscription start">
          <input className="input" type="date" value={dateInput(d.subscriptionStartDate)} onChange={(e) => set("subscriptionStartDate", e.target.value || null)} />
        </Field>
        <Field label="Preferred payment method">
          <select className="input" value={d.paymentMethod ?? ""} onChange={(e) => set("paymentMethod", e.target.value)}>
            <option value="">—</option>
            {(options.paymentMethod ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className="input" value={d.status ?? "Active"} onChange={(e) => set("status", e.target.value)}>
            {(options.clientStatus ?? ["Active", "Trial", "Paused", "Cancelled"]).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes">
            <textarea className="input" rows={2} value={d.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
