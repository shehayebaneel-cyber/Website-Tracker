import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { money, statusTone } from "../lib/format";
import { Page, PageHeader } from "../components/Page";
import { Card, Spinner, ErrorState } from "../components/ui";
import InvoiceForm from "./InvoiceForm";

interface Cell { status: string; invoiceId: string | null; amountDue: number; balance: number }
interface Row {
  clientId: string; code: string; businessName: string; status: string;
  months: Cell[]; billed: number; paid: number; balance: number;
  lastPaymentDate: string | null; paidMonths: number; unpaidMonths: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// short cell label per status
const CELL_LABEL: Record<string, string> = {
  "Paid On Time": "Paid", "Paid Late": "Late", Overdue: "Over", "Partially Paid": "Part",
  Due: "Due", "Not Billed": "—", "Not Started": "", Future: "", Cancelled: "✕",
};

export default function MonthlyOverview() {
  const nav = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [make, setMake] = useState<{ clientId: string; month: string } | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.get<{ rows: Row[] }>(`/monthly?year=${year}`).then((r) => setRows(r.rows)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(load, [year]);

  function onCell(row: Row, mi: number, cell: Cell) {
    if (cell.invoiceId) { nav(`/clients/${row.clientId}`); return; }
    if (cell.status === "Not Billed") {
      setMake({ clientId: row.clientId, month: `${year}-${String(mi + 1).padStart(2, "0")}` });
    }
  }

  return (
    <Page>
      <PageHeader
        title="Monthly Overview"
        subtitle="Subscription status for every client across the year"
        actions={
          <div className="flex items-center gap-1">
            <button className="btn btn-sm" onClick={() => setYear((y) => y - 1)}>‹</button>
            <span className="tnum px-2 font-semibold">{year}</span>
            <button className="btn btn-sm" onClick={() => setYear((y) => y + 1)}>›</button>
          </div>
        }
      />

      <Legend />

      {error ? <ErrorState message={error} onRetry={load} /> : loading && rows.length === 0 ? (
        <div className="py-16 text-center"><span className="inline-block"><Spinner /></span></div>
      ) : (
        <Card className="mt-3 overflow-x-auto" >
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b" style={{ background: "var(--surface-2)" }}>
                <th className="sticky left-0 z-10 px-3 py-2.5 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)", background: "var(--surface-2)" }}>Client</th>
                {MONTHS.map((m) => <th key={m} className="px-1 py-2.5 text-center text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>{m}</th>)}
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Billed</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Paid</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Bal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.clientId} className="border-b" style={{ borderColor: "var(--line-2)" }}>
                  <td className="sticky left-0 z-10 px-3 py-2" style={{ background: "var(--surface)" }}>
                    <button className="text-left" onClick={() => nav(`/clients/${row.clientId}`)}>
                      <div className="font-medium" style={{ color: "var(--ink)" }}>{row.businessName}</div>
                      <div className="tnum text-[11px]" style={{ color: "var(--muted)" }}>{row.code} · {row.paidMonths} paid / {row.unpaidMonths} unpaid</div>
                    </button>
                  </td>
                  {row.months.map((cell, mi) => (
                    <td key={mi} className="p-1 text-center">
                      <CellBox cell={cell} onClick={() => onCell(row, mi, cell)} />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right tnum">{money(row.billed)}</td>
                  <td className="px-3 py-2 text-right tnum" style={{ color: "var(--good)" }}>{money(row.paid)}</td>
                  <td className="px-3 py-2 text-right tnum font-semibold" style={{ color: row.balance > 0 ? "var(--crit)" : "var(--ink-2)" }}>{money(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {rows.length > 0 && (
        <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
          Click a paid/due cell to open the client · click a “—” (not billed) cell to create that month's invoice.
        </p>
      )}

      {make && (
        <InvoiceForm
          open
          clientId={make.clientId}
          month={make.month}
          onClose={() => setMake(null)}
          onSaved={() => { setMake(null); load(); }}
        />
      )}
    </Page>
  );
}

function CellBox({ cell, onClick }: { cell: Cell; onClick: () => void }) {
  const tone = statusTone(cell.status);
  const clickable = !!cell.invoiceId || cell.status === "Not Billed";
  const label = CELL_LABEL[cell.status] ?? "";
  const title = `${cell.status}${cell.amountDue ? ` · due ${money(cell.amountDue)}` : ""}${cell.balance ? ` · bal ${money(cell.balance)}` : ""}`;
  return (
    <button
      onClick={onClick}
      disabled={!clickable}
      title={title}
      className={`pill pill-${tone} w-full justify-center`}
      style={{ minWidth: 46, cursor: clickable ? "pointer" : "default", opacity: cell.status === "Future" || cell.status === "Not Started" ? 0.4 : 1 }}
    >
      {label || "·"}
    </button>
  );
}

function Legend() {
  const items: [string, string][] = [
    ["Paid On Time", "Paid"], ["Paid Late", "Late"], ["Partially Paid", "Partial"],
    ["Overdue", "Overdue"], ["Due", "Due"], ["Not Billed", "Not billed"], ["Cancelled", "Cancelled"],
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([s, label]) => <span key={s} className={`pill pill-${statusTone(s)}`}>{label}</span>)}
    </div>
  );
}
