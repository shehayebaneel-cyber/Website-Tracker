import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { money } from "../lib/format";
import { Modal } from "../components/Modal";
import { Spinner } from "../components/ui";

interface Row {
  clientId: string;
  clientCode: string;
  businessName: string;
  monthlyFee: number;
  status: string;
  alreadyInvoiced: boolean;
  existingCode: string | null;
  eligible: boolean;
}

function thisMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function GenerateInvoices({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [month, setMonth] = useState(thisMonthKey());
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  function preview() {
    setLoading(true);
    setResult(null);
    api.post<{ rows: Row[] }>("/invoices/generate/preview", { month })
      .then((r) => {
        setRows(r.rows);
        setSelected(new Set(r.rows.filter((x) => x.eligible).map((x) => x.clientId)));
      })
      .finally(() => setLoading(false));
  }
  useEffect(() => { if (open) preview(); /* eslint-disable-next-line */ }, [open, month]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function generate() {
    setBusy(true);
    try {
      const r = await api.post<{ created: string[]; skipped: any[] }>("/invoices/generate", { month, clientIds: [...selected] });
      setResult({ created: r.created.length, skipped: r.skipped.length });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  const eligibleCount = rows.filter((r) => r.eligible).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Generate monthly invoices"
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>Close</button>
          <button className="btn btn-primary" onClick={generate} disabled={busy || selected.size === 0}>
            {busy ? "Generating…" : `Generate ${selected.size} invoice${selected.size === 1 ? "" : "s"}`}
          </button>
        </>
      }
    >
      <div className="mb-3 flex items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="label">Month</span>
          <input className="input" style={{ width: "auto" }} type="month" value={month} onChange={(e) => setMonth(e.target.value || thisMonthKey())} />
        </label>
        <span className="text-xs" style={{ color: "var(--muted)" }}>{eligibleCount} eligible · paused/cancelled excluded · duplicates skipped</span>
      </div>

      {result && (
        <div className="pill pill-good mb-3 w-full justify-center py-2">
          Created {result.created} invoice(s){result.skipped ? `, skipped ${result.skipped}` : ""}.
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center"><span className="inline-block"><Spinner /></span></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b" style={{ background: "var(--surface-2)" }}>
                <th className="w-10 px-3 py-2"></th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Client</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Fee</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.clientId} className="border-b" style={{ borderColor: "var(--line-2)", opacity: r.eligible ? 1 : 0.55 }}>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" disabled={!r.eligible} checked={selected.has(r.clientId)} onChange={() => toggle(r.clientId)} />
                  </td>
                  <td className="px-3 py-2"><span className="tnum font-medium">{r.clientCode}</span> · {r.businessName}</td>
                  <td className="px-3 py-2 text-right tnum">{money(r.monthlyFee)}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: "var(--muted)" }}>
                    {r.alreadyInvoiced ? `already invoiced (${r.existingCode})` : r.monthlyFee <= 0 ? "no monthly fee" : "ready"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
