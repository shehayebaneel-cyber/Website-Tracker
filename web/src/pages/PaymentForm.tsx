import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { useOptions } from "../lib/useOptions";
import { useClientOptions } from "../lib/useClients";
import type { Payment, Invoice, Paged } from "../lib/types";
import { money, fmtMonth } from "../lib/format";
import { Modal } from "../components/Modal";
import { Field } from "../components/ui";

export default function PaymentForm({
  open, onClose, onSaved, clientId, invoiceId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (p: Payment) => void;
  clientId?: string;
  invoiceId?: string;
}) {
  const options = useOptions();
  const clients = useClientOptions();
  const [cid, setCid] = useState(clientId ?? "");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [iid, setIid] = useState(invoiceId ?? "");
  const [amount, setAmount] = useState<number | "">("");
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [depositStatus, setDepositStatus] = useState("Not Deposited");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOver, setConfirmOver] = useState<string | null>(null);

  // load unpaid invoices for the chosen client
  useEffect(() => {
    if (!cid) { setInvoices([]); return; }
    api.get<Paged<Invoice>>(`/invoices?clientId=${cid}&pageSize=200`).then((r) => setInvoices(r.items.filter((i) => i.balance > 0 || i.id === iid))).catch(() => {});
    // eslint-disable-next-line
  }, [cid]);

  // prefill amount to invoice balance
  useEffect(() => {
    const inv = invoices.find((i) => i.id === iid);
    if (inv && amount === "") setAmount(inv.balance);
    // eslint-disable-next-line
  }, [iid, invoices]);

  async function save(allowOverpayment = false) {
    setBusy(true);
    setError(null);
    try {
      const body: any = {
        clientId: cid || undefined,
        invoiceId: iid || undefined,
        amount: Number(amount || 0),
        method, reference: reference || null, receivedBy: receivedBy || null,
        depositStatus, allowOverpayment,
      };
      const res = await api.post<{ payment: Payment }>("/payments", body);
      onSaved(res.payment);
    } catch (e) {
      // Server returns 409 {error:"overpayment"} when amount > invoice balance.
      if (e instanceof ApiError && e.status === 409 && e.message === "overpayment") {
        const bal = selInvoice ? money(selInvoice.balance) : "the invoice balance";
        setConfirmOver(`This payment (${money(Number(amount || 0))}) is more than ${bal}. Record it as an overpayment?`);
      } else {
        setError(e instanceof ApiError ? e.message : "Could not record payment");
      }
    } finally {
      setBusy(false);
    }
  }

  const selInvoice = invoices.find((i) => i.id === iid);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record payment"
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={() => save(false)} disabled={busy || !cid || !amount}>
            {busy ? "Saving…" : "Record payment"}
          </button>
        </>
      }
    >
      {error && <div className="pill pill-crit mb-3 w-full justify-center py-2">{error}</div>}
      {confirmOver && (
        <div className="mb-3 rounded-lg border p-3" style={{ borderColor: "var(--attn-line)", background: "var(--attn-bg)" }}>
          <div className="mb-2 text-sm" style={{ color: "var(--attn)" }}>{confirmOver}</div>
          <div className="flex gap-2">
            <button className="btn btn-sm" onClick={() => setConfirmOver(null)}>Cancel</button>
            <button className="btn btn-sm btn-primary" onClick={() => { setConfirmOver(null); save(true); }}>Yes, overpay</button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Client *">
          <select className="input" value={cid} onChange={(e) => { setCid(e.target.value); setIid(""); }} disabled={!!clientId || !!invoiceId}>
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.businessName}</option>)}
          </select>
        </Field>
        <Field label="Apply to invoice">
          <select className="input" value={iid} onChange={(e) => { setIid(e.target.value); setAmount(""); }} disabled={!!invoiceId}>
            <option value="">Unallocated / on account</option>
            {invoices.map((i) => <option key={i.id} value={i.id}>{i.code} · {fmtMonth(i.billingMonth)} · bal {money(i.balance)}</option>)}
          </select>
        </Field>
        <Field label="Amount *">
          <input className="input tnum" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} />
        </Field>
        <Field label="Method">
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            {(options.paymentMethod ?? ["Cash"]).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Reference">
          <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Whish txn, cheque no…" />
        </Field>
        <Field label="Received by">
          <input className="input" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
        </Field>
        <Field label="Deposit status">
          <select className="input" value={depositStatus} onChange={(e) => setDepositStatus(e.target.value)}>
            {(options.depositStatus ?? ["Not Deposited", "Deposited", "Not Applicable"]).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
      </div>
      {selInvoice && <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>Invoice balance is {money(selInvoice.balance)}. Partial payments are allowed.</p>}
    </Modal>
  );
}
