import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { api, qs } from "../lib/api";
import { useClientOptions } from "../lib/useClients";
import { useOptions } from "../lib/useOptions";
import { money, num, pct, fmtDate, monthLabel } from "../lib/format";
import { Page, PageHeader } from "../components/Page";
import { Card, Spinner, ErrorState, EmptyState } from "../components/ui";

interface ReportData {
  summary: { mrr: number; totalBilled: number; totalCollected: number; outstanding: number; collectionRate: number | null; overdueAmount: number; totalExpenses: number; netCashFlow: number; activeClients: number };
  revenueByClient: any[]; revenueByPlan: any[]; expensesByCategory: any[]; clientProfitability: any[];
  supportHoursByClient: any[]; paidExtraWork: number; unbilledExtraWork: { total: number; items: any[] };
  upcomingRenewals: any[]; cancelledClients: any[]; clientGrowth: { month: string; active: number }[]; renewalsDueCount: number;
}

function isoDaysAgo(days: number) { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); }
function isoToday() { return new Date().toISOString().slice(0, 10); }

export default function Reports() {
  const nav = useNavigate();
  const clients = useClientOptions();
  const options = useOptions();
  const [from, setFrom] = useState(isoDaysAgo(365));
  const [to, setTo] = useState(isoToday());
  const [clientId, setClientId] = useState("");
  const [plan, setPlan] = useState("All");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true); setError(null);
    api.get<ReportData>(`/reports${qs({ from, to, clientId, plan })}`).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(load, [from, to, clientId, plan]);

  const exports: [string, string][] = [
    ["Clients", "/api/export/clients.csv"], ["Websites", "/api/export/websites.csv"],
    ["Invoices", "/api/export/invoices.csv"], ["Payments", "/api/export/payments.csv"],
    ["Expenses", "/api/export/expenses.csv"], ["Support", "/api/export/support.csv"],
  ];

  return (
    <Page>
      <PageHeader title="Reports" subtitle="Revenue, expenses, profitability and renewals"
        actions={<button className="btn" onClick={() => window.print()}>Print / PDF</button>} />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1"><span className="label">From</span><input className="input" style={{ width: "auto" }} type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="flex flex-col gap-1"><span className="label">To</span><input className="input" style={{ width: "auto" }} type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <label className="flex flex-col gap-1"><span className="label">Client</span>
            <select className="input" style={{ width: "auto" }} value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">All clients</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1"><span className="label">Plan</span>
            <select className="input" style={{ width: "auto" }} value={plan} onChange={(e) => setPlan(e.target.value)}>
              <option value="All">All plans</option>
              {(options.servicePlan ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {exports.map(([label, href]) => <a key={label} className="btn btn-sm" href={href}>⤓ {label}</a>)}
          </div>
        </div>
      </Card>

      {error ? <ErrorState message={error} onRetry={load} /> : loading && !data ? (
        <div className="py-16 text-center"><span className="inline-block"><Spinner /></span></div>
      ) : data && (
        <div className="flex flex-col gap-4" style={{ opacity: loading ? 0.6 : 1 }}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="MRR" value={money(data.summary.mrr)} />
            <Stat label="Total billed" value={money(data.summary.totalBilled)} />
            <Stat label="Total collected" value={money(data.summary.totalCollected)} tone="good" />
            <Stat label="Collection rate" value={pct(data.summary.collectionRate)} />
            <Stat label="Outstanding" value={money(data.summary.outstanding)} tone={data.summary.outstanding > 0 ? "attn" : "good"} />
            <Stat label="Overdue" value={money(data.summary.overdueAmount)} tone={data.summary.overdueAmount > 0 ? "crit" : "good"} />
            <Stat label="Expenses" value={money(data.summary.totalExpenses)} tone="attn" />
            <Stat label="Net cash flow" value={money(data.summary.netCashFlow)} tone={data.summary.netCashFlow >= 0 ? "good" : "crit"} />
          </div>

          <ReportCard title="Client growth (active clients / month)">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.clientGrowth} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip labelFormatter={(l) => monthLabel(String(l))} />
                <Line type="monotone" dataKey="active" stroke="#e8712b" strokeWidth={2.5} dot={{ r: 2.5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ReportCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TableCard title="Revenue by client" empty={data.revenueByClient.length === 0}
              head={["Client", "Billed", "Paid", "Balance"]}
              rows={data.revenueByClient.map((r) => ({ key: r.clientId, onClick: () => nav(`/clients/${r.clientId}`), cells: [r.businessName, money(r.billed), money(r.paid), money(r.balance)] }))} />

            <TableCard title="Client profitability (paid − expenses)" empty={data.clientProfitability.length === 0}
              head={["Client", "Revenue", "Expenses", "Profit"]}
              rows={data.clientProfitability.map((r) => ({ key: r.clientId, onClick: () => nav(`/clients/${r.clientId}`), cells: [r.businessName, money(r.revenue), money(r.expenses), <b style={{ color: r.profit >= 0 ? "var(--good)" : "var(--crit)" }}>{money(r.profit)}</b>] }))} />

            <TableCard title="Revenue by plan" empty={data.revenueByPlan.length === 0}
              head={["Plan", "Clients", "MRR"]}
              rows={data.revenueByPlan.map((r) => ({ key: r.name, cells: [r.name, num(r.clients), money(r.mrr)] }))} />

            <TableCard title="Expenses by category" empty={data.expensesByCategory.length === 0}
              head={["Category", "Total"]}
              rows={data.expensesByCategory.map((r) => ({ key: r.name, cells: [r.name, money(r.total)] }))} />

            <TableCard title="Support hours by client" empty={data.supportHoursByClient.length === 0}
              head={["Client", "Hours"]}
              rows={data.supportHoursByClient.map((r, i) => ({ key: String(i), cells: [r.name, num(r.hours)] }))} />

            <TableCard title={`Unbilled extra work (${money(data.unbilledExtraWork.total)})`} empty={data.unbilledExtraWork.items.length === 0}
              head={["Ticket", "Client", "Amount"]}
              rows={data.unbilledExtraWork.items.map((r) => ({ key: r.code, onClick: () => nav(`/clients/${r.clientId}`), cells: [r.code, r.clientName, money(r.amount)] }))} />

            <TableCard title={`Upcoming renewals (${data.renewalsDueCount})`} empty={data.upcomingRenewals.length === 0}
              head={["Website", "Type", "Days"]}
              rows={data.upcomingRenewals.map((r, i) => ({ key: String(i), onClick: () => nav(`/websites/${r.websiteId}`), cells: [`${r.clientName} (${r.code})`, r.kind, `${r.daysRemaining}d`] }))} />

            <TableCard title="Cancelled clients" empty={data.cancelledClients.length === 0}
              head={["Client", "Cancelled"]}
              rows={data.cancelledClients.map((r) => ({ key: r.clientId, onClick: () => nav(`/clients/${r.clientId}`), cells: [r.businessName, fmtDate(r.cancellationDate)] }))} />
          </div>
        </div>
      )}
    </Page>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "attn" | "crit" }) {
  const color = tone === "good" ? "var(--good)" : tone === "attn" ? "var(--attn)" : tone === "crit" ? "var(--crit)" : "var(--ink)";
  return (
    <Card className="p-3">
      <div className="label mb-1 leading-tight">{label}</div>
      <div className="tnum text-lg font-bold leading-none" style={{ color }}>{value}</div>
    </Card>
  );
}

function ReportCard({ title, children }: { title: string; children: ReactNode }) {
  return <Card className="p-4"><div className="mb-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>{title}</div>{children}</Card>;
}

function TableCard({ title, head, rows, empty }: { title: string; head: string[]; rows: { key: string; onClick?: () => void; cells: ReactNode[] }[]; empty: boolean }) {
  return (
    <Card className="p-4">
      <div className="mb-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>{title}</div>
      {empty ? <EmptyState title="No data in range" /> : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--line)" }}>
                {head.map((h, i) => <th key={h} className={`px-2 py-1.5 text-xs font-semibold uppercase ${i === 0 ? "text-left" : "text-right"}`} style={{ color: "var(--muted)" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} onClick={r.onClick} className={`border-b ${r.onClick ? "cursor-pointer" : ""}`} style={{ borderColor: "var(--line-2)" }}>
                  {r.cells.map((c, i) => <td key={i} className={`px-2 py-1.5 ${i === 0 ? "text-left" : "text-right tnum"}`}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
