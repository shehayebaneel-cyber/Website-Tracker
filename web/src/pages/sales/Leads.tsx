import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, qs } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useOptions } from "../../lib/useOptions";
import { canAccess } from "../../lib/perms";
import type { Lead } from "../../lib/salesTypes";
import { fmtDate } from "../../lib/format";
import { Page, PageHeader, Toolbar } from "../../components/Page";
import { DataTable, type Column, type Sort } from "../../components/DataTable";
import { StatusPill, ErrorState, EmptyState } from "../../components/ui";
import LeadForm from "./LeadForm";

export default function Leads() {
  const nav = useNavigate();
  const { user } = useAuth();
  const options = useOptions();
  const isAdmin = canAccess(user?.role, "salesTeam");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState<Sort>({ id: "updatedAt", desc: true });
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function load() {
    setLoading(true); setError(null);
    api.get<{ items: Lead[] }>(`/leads${qs({ q, status })}`).then((r) => setRows(r.items)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q, status]);

  const contactCell = (l: Lead) => (
    <div className="flex gap-1.5">
      {l.whatsapp && <a className="btn btn-sm" onClick={(e) => e.stopPropagation()} href={`https://wa.me/${l.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">WA</a>}
      {l.phone && <a className="btn btn-sm" onClick={(e) => e.stopPropagation()} href={`tel:${l.phone}`}>Call</a>}
      {!l.whatsapp && !l.phone && <span style={{ color: "var(--muted)" }}>—</span>}
    </div>
  );

  const columns: Column<Lead>[] = [
    { id: "code", header: "Lead", cell: (l) => <span className="tnum font-semibold">{l.code}</span> },
    { id: "businessName", header: "Business", primary: true, cell: (l) => (
      <div><div className="font-medium">{l.businessName}</div>{l.city && <div className="text-xs" style={{ color: "var(--muted)" }}>{l.city}</div>}</div>
    ) },
    { id: "status", header: "Status", cell: (l) => <StatusPill status={l.status} /> },
    { id: "source", header: "Source", hideMobile: true, cell: (l) => l.source ?? "—" },
    ...(isAdmin ? [{ id: "sp", header: "Salesperson", cell: (l: Lead) => l.salespersonName ?? "—" } as Column<Lead>] : []),
    { id: "nextFollowUpDate", header: "Next follow-up", cell: (l) => fmtDate(l.nextFollowUpDate) },
    { id: "contact", header: "Contact", cell: contactCell },
  ];

  return (
    <Page>
      <PageHeader title="Leads" subtitle={isAdmin ? "All leads across the team" : "Your leads"}
        actions={<button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New lead</button>} />
      <Toolbar>
        <input className="input" style={{ maxWidth: 240 }} placeholder="Search business, phone, IG…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="All">All statuses</option>
          {(options.leadStatus ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Toolbar>

      {error ? <ErrorState message={error} onRetry={load} /> : (
        <DataTable columns={columns} rows={rows} rowKey={(l) => l.id} sort={sort} onSort={setSort} loading={loading}
          onRowClick={(l) => nav(`/sales/leads/${l.id}`)}
          empty={<EmptyState title="No leads yet" hint="Add your first lead" />} />
      )}

      {showForm && <LeadForm open={showForm} isAdmin={isAdmin} onClose={() => setShowForm(false)} onSaved={(l) => { setShowForm(false); nav(`/sales/leads/${l.id}`); }} />}
    </Page>
  );
}
