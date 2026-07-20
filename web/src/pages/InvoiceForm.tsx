import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { useOptions } from "../lib/useOptions";
import { useClientOptions } from "../lib/useClients";
import type { Invoice } from "../lib/types";
import { Modal } from "../components/Modal";
import { Field } from "../components/ui";

function thisMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function InvoiceForm({
  open, onClose, onSaved, clientId, month: monthProp,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (i: Invoice) => void;
  clientId?: string;
  month?: string;
}) {
  const options = useOptions();
  const clients = useClientOptions();
  const [cid, setCid] = useState(clientId ?? "");
  const [chargeType, setChargeType] = useState("Monthly Subscription");
  const [month, setMonth] = useState(monthProp ?? thisMonthKey());
  const [amount, setAmount] = useState<number | "">("");
  const [discount, setDiscount] = useState(0);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSub = chargeType === "Monthly Subscription";
  const client = useMemo(() => clients.find((c) => c.id === cid), [clients, cid]);
  const effectiveAmount = isSub ? client?.monthlyFee ?? 0 : Number(amount || 0);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body: any = { clientId: cid, chargeType, billingMonth: month, discount, description: description || null };
      if (!isSub) body.amount = Number(amount || 0);
      const res = await api.post<{ invoice: Invoice }>("/invoices", body);
      onSaved(res.invoice);
    } catch (e: any) {
      setError(e.message || "Could not create invoice");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New invoice"
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy || !cid || (!isSub && !amount)}>
            {busy ? "Creating…" : "Create invoice"}
          </button>
        </>
      }
    >
      {error && <div className="pill pill-crit mb-3 w-full justify-center py-2">{error}</div>}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Client *">
          <select className="input" value={cid} onChange={(e) => setCid(e.target.value)} disabled={!!clientId}>
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.businessName}</option>)}
          </select>
        </Field>
        <Field label="Charge type">
          <select className="input" value={chargeType} onChange={(e) => setChargeType(e.target.value)}>
            {(options.chargeType ?? ["Monthly Subscription"]).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Billing month">
          <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value || thisMonthKey())} />
        </Field>
        <Field label={isSub ? "Amount (from monthly fee)" : "Amount *"}>
          <input className="input tnum" type="number" min={0} step="0.01"
            value={isSub ? effectiveAmount : amount}
            disabled={isSub}
            onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} />
        </Field>
        <Field label="Discount">
          <input className="input tnum" type="number" min={0} step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value || 0))} />
        </Field>
        <Field label="Amount due">
          <input className="input tnum" value={(effectiveAmount - discount).toFixed(2)} disabled />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isSub ? "Monthly website subscription" : "e.g. Extra homepage redesign"} />
          </Field>
        </div>
      </div>
      {isSub && <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>Subscription amount is taken from the client's monthly fee. Only one subscription invoice is allowed per client per month.</p>}
    </Modal>
  );
}
