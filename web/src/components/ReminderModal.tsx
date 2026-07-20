import { useState } from "react";
import { api } from "../lib/api";
import { money, fmtDate } from "../lib/format";
import { companyName } from "../lib/appConfig";
import { Modal } from "./Modal";
import { StatusPill } from "./ui";

export interface ReminderTarget {
  invoiceId: string;
  clientName: string;
  contactName: string | null;
  phone: string | null;
  invoiceCode: string;
  balance: number;
  daysLate: number;
  dueDate: string;
  reminderStatus: string;
}

function buildMessage(t: ReminderTarget): string {
  const who = t.contactName || t.clientName;
  const co = companyName();
  const timing = t.daysLate > 0
    ? `is now ${t.daysLate} day${t.daysLate === 1 ? "" : "s"} overdue`
    : `is due on ${fmtDate(t.dueDate)}`;
  return (
    `Hello ${who}, a friendly reminder from ${co}. ` +
    `Invoice ${t.invoiceCode} for ${money(t.balance)} ${timing}. ` +
    `Please let me know once it's settled — thank you!`
  );
}

// Review-before-send reminders. Nothing is sent automatically: you review/edit
// the message, then send it yourself through WhatsApp (or copy it), and record
// the reminder status. No messaging provider or credentials required.
export default function ReminderModal({
  open, onClose, target, onStatusChanged,
}: {
  open: boolean;
  onClose: () => void;
  target: ReminderTarget;
  onStatusChanged?: () => void;
}) {
  const [message, setMessage] = useState(() => buildMessage(target));
  const [status, setStatus] = useState(target.reminderStatus);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const digits = (target.phone || "").replace(/[^0-9]/g, "");
  const waHref = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null;

  async function setReminder(value: string) {
    setBusy(true);
    try {
      await api.patch(`/invoices/${target.invoiceId}`, { reminderStatus: value });
      setStatus(value);
      onStatusChanged?.();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Reminder · ${target.invoiceCode}`}
      footer={<button className="btn" onClick={onClose}>Done</button>}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm" style={{ color: "var(--ink)" }}>
          <span className="font-semibold">{target.clientName}</span>
          <span style={{ color: "var(--muted)" }}> · balance {money(target.balance)}</span>
        </div>
        <StatusPill status={status} />
      </div>

      <label className="label">Message (edit before sending)</label>
      <textarea className="input mt-1" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />

      {!target.phone && (
        <p className="mt-2 text-xs" style={{ color: "var(--attn)" }}>
          No phone number on this client — add one to enable WhatsApp, or copy the message.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {waHref
          ? <a className="btn btn-primary" href={waHref} target="_blank" rel="noreferrer" onClick={() => status === "Not Sent" && setReminder("Sent")}>Open in WhatsApp ↗</a>
          : <button className="btn btn-primary" disabled>Open in WhatsApp</button>}
        <button className="btn" onClick={copy}>{copied ? "Copied ✓" : "Copy message"}</button>
      </div>

      <div className="mt-4">
        <div className="label mb-1.5">Record reminder status</div>
        <div className="flex flex-wrap gap-1.5">
          {["Sent", "Followed Up", "Payment Promised", "Not Sent"].map((s) => (
            <button key={s} className={`btn btn-sm ${status === s ? "btn-primary" : ""}`} disabled={busy} onClick={() => setReminder(s)}>{s}</button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs" style={{ color: "var(--muted)" }}>
        Messages are never sent automatically — you send them yourself and record the outcome here.
      </p>
    </Modal>
  );
}
