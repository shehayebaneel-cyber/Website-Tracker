import { useEffect, useState, type ReactNode } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../../lib/api";
import type { Salesperson, Lead, Assignment } from "../../lib/salesTypes";
import { money, num, fmtDate, fmtMonth, pct } from "../../lib/format";
import { Page, PageHeader } from "../../components/Page";
import { Card, Spinner, ErrorState, EmptyState, StatusPill, Detail } from "../../components/ui";
import SalespersonForm from "./SalespersonForm";

const TABS = ["Overview", "Leads", "Assigned Clients"] as const;
type Tab = (typeof TABS)[number];

export default function SalespersonProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const [sp, setSp] = useState<Salesperson | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tab, setTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true); setError(null);
    Promise.all([
      api.get<{ salesperson: Salesperson }>(`/salespeople/${id}`),
      api.get<{ items: Lead[] }>(`/leads?salespersonId=${id}`),
      api.get<{ items: Assignment[] }>(`/assignments?salespersonId=${id}`),
    ]).then(([s, l, a]) => { setSp(s.salesperson); setLeads(l.items); setAssignments(a.items); })
      .catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  async function deactivate() {
    if (!confirm("Deactivate this salesperson? Their portal login will be disabled and no new commission will generate.")) return;
    setBusy(true);
    try { await api.post(`/salespeople/${id}/deactivate`, {}); load(); } finally { setBusy(false); }
  }

  if (loading && !sp) return <Page><div className="py-16 text-center"><span className="inline-block"><Spinner /></span></div></Page>;
  if (error) return <Page><ErrorState message={error} onRetry={load} /></Page>;
  if (!sp) return null;
  const s = sp.summary;

  return (
    <Page>
      <PageHeader
        back={<Link to="/sales/team" className="mb-1 inline-block text-xs font-medium" style={{ color: "var(--accent)" }}>← Sales Team</Link>}
        title={<span className="flex items-center gap-2.5">{sp.fullName} <StatusPill status={sp.status} /></span>}
        subtitle={<span className="tnum">{sp.code}{sp.city ? ` · ${sp.city}` : ""}{sp.phone ? ` · ${sp.phone}` : ""}{sp.hasLogin ? " · has login" : ""}</span>}
        actions={<>
          <button className="btn" onClick={() => setEditing(true)}>Edit</button>
          {sp.status === "Active" && <button className="btn" disabled={busy} onClick={deactivate}>Deactivate</button>}
        </>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Mini label="Assigned clients" value={num(s?.currentAssignedClients)} />
        <Mini label="Paying websites" value={num(s?.activePayingWebsites)} tone="good" />
        <Mini label="Unpaid clients" value={num(s?.unpaidClients)} tone={(s?.unpaidClients ?? 0) > 0 ? "crit" : undefined} />
        <Mini label="Active leads" value={num(s?.activeLeads)} />
        <Mini label="Est. commission" value={money(s?.estimatedMonthlyCommission)} tone="accent" />
        <Mini label="Retention" value={s?.retentionRate != null ? pct(s.retentionRate) : "—"} />
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b" style={{ borderColor: "var(--line)" }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="relative whitespace-nowrap px-3.5 py-2.5 text-sm font-medium" style={{ color: tab === t ? "var(--accent)" : "var(--muted)" }}>
            {t}{t === "Leads" ? ` (${leads.length})` : t === "Assigned Clients" ? ` (${assignments.length})` : ""}
            {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded" style={{ background: "var(--accent)" }} />}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>Details</div>
          <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
            <Detail label="Email">{sp.email}</Detail>
            <Detail label="Start date">{fmtDate(sp.startDate)}</Detail>
            <Detail label="Commission">{sp.commissionMethod === "Fixed" ? `${money(sp.commissionAmount)}/mo` : `${sp.commissionPercent}%`}</Detail>
            <Detail label="Payment method">{sp.paymentMethod}</Detail>
            <Detail label="Whish">{sp.whishNumber}</Detail>
            <Detail label="Clients brought">{num(s?.totalClientsBrought)}</Detail>
          </div>
          {sp.notes && <p className="mt-3 whitespace-pre-wrap text-sm" style={{ color: "var(--ink-2)" }}>{sp.notes}</p>}
        </Card>
      )}

      {tab === "Leads" && (
        <MiniTable empty="No leads" rows={leads} onRow={(l) => nav(`/sales/leads/${l.id}`)}
          cols={[
            { h: "Lead", c: (l) => <span className="tnum font-semibold">{l.code}</span> },
            { h: "Business", c: (l) => l.businessName },
            { h: "Status", c: (l) => <StatusPill status={l.status} /> },
            { h: "Next follow-up", c: (l) => fmtDate(l.nextFollowUpDate) },
          ]} />
      )}

      {tab === "Assigned Clients" && (
        <MiniTable empty="No assigned clients" rows={assignments} onRow={(a) => nav(`/clients/${a.clientId}`)}
          cols={[
            { h: "Client", c: (a) => a.clientName },
            { h: "Monthly", c: (a) => <span className="tnum">{money(a.monthlyFee ?? 0)}</span>, align: "right" },
            { h: "Commission", c: (a) => <span className="tnum">{a.commissionMethod === "Fixed" ? money(a.commissionAmount ?? 0) : `${a.commissionPercent}%`}</span>, align: "right" },
            { h: "Since", c: (a) => fmtMonth(a.effectiveBillingMonth) },
            { h: "Status", c: (a) => <StatusPill status={a.status} /> },
          ]} />
      )}

      {editing && <SalespersonForm open={editing} existing={sp} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
    </Page>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "good" | "crit" | "accent" }) {
  const color = tone === "crit" ? "var(--crit)" : tone === "good" ? "var(--good)" : tone === "accent" ? "var(--accent)" : "var(--ink)";
  return <Card className="p-3"><div className="label mb-1 leading-tight">{label}</div><div className="tnum text-lg font-bold leading-none" style={{ color }}>{value}</div></Card>;
}

interface MiniCol<T> { h: string; c: (row: T) => ReactNode; align?: "right" }
function MiniTable<T extends { id: string }>({ rows, cols, empty, onRow }: { rows: T[]; cols: MiniCol<T>[]; empty: string; onRow?: (r: T) => void }) {
  if (rows.length === 0) return <Card className="p-2"><EmptyState title={empty} /></Card>;
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead><tr className="border-b" style={{ background: "var(--surface-2)" }}>
          {cols.map((col) => <th key={col.h} className={`px-3.5 py-2.5 text-xs font-semibold uppercase ${col.align === "right" ? "text-right" : "text-left"}`} style={{ color: "var(--muted)" }}>{col.h}</th>)}
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onRow?.(r)} className={`border-b ${onRow ? "cursor-pointer" : ""}`} style={{ borderColor: "var(--line-2)" }}>
              {cols.map((col) => <td key={col.h} className={`px-3.5 py-2.5 ${col.align === "right" ? "text-right tnum" : "text-left"}`}>{col.c(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
