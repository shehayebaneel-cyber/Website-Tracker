import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import type { Salesperson } from "../../lib/salesTypes";
import { money, num } from "../../lib/format";
import { Page, PageHeader, Toolbar } from "../../components/Page";
import { DataTable, type Column } from "../../components/DataTable";
import { StatusPill, ErrorState, EmptyState } from "../../components/ui";
import SalespersonForm from "./SalespersonForm";

export default function SalesTeam() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Salesperson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function load() {
    setLoading(true); setError(null);
    api.get<{ items: Salesperson[] }>(`/salespeople${q ? `?q=${encodeURIComponent(q)}` : ""}`).then((r) => setRows(r.items)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q]);

  const columns: Column<Salesperson>[] = [
    { id: "code", header: "ID", cell: (s) => <span className="tnum font-semibold">{s.code}</span> },
    { id: "fullName", header: "Name", primary: true, cell: (s) => (
      <div><div className="font-medium">{s.fullName}</div>{s.city && <div className="text-xs" style={{ color: "var(--muted)" }}>{s.city}</div>}</div>
    ) },
    { id: "clients", header: "Clients", align: "center", cell: (s) => num(s.summary?.currentAssignedClients) },
    { id: "paying", header: "Paying", align: "center", cell: (s) => num(s.summary?.activePayingWebsites) },
    { id: "leads", header: "Leads", align: "center", hideMobile: true, cell: (s) => num(s.summary?.activeLeads) },
    { id: "comm", header: "Est. commission", align: "right", cell: (s) => <span className="tnum" style={{ color: "var(--attn)" }}>{money(s.summary?.estimatedMonthlyCommission)}</span> },
    { id: "status", header: "Status", cell: (s) => <StatusPill status={s.status} /> },
  ];

  return (
    <Page>
      <PageHeader title="Sales Team" subtitle="Your commission-only salespeople"
        actions={<button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New salesperson</button>} />
      <Toolbar>
        <input className="input" style={{ maxWidth: 260 }} placeholder="Search name, ID, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
      </Toolbar>

      {error ? <ErrorState message={error} onRetry={load} /> : (
        <DataTable columns={columns} rows={rows} rowKey={(s) => s.id} loading={loading}
          onRowClick={(s) => nav(`/sales/team/${s.id}`)}
          empty={<EmptyState title="No salespeople yet" hint="Add your first salesperson" />} />
      )}

      {showForm && <SalespersonForm open={showForm} onClose={() => setShowForm(false)} onSaved={(s) => { setShowForm(false); nav(`/sales/team/${s.id}`); }} />}
    </Page>
  );
}
