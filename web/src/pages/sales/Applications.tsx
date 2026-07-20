import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, qs } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { Page, PageHeader, Toolbar } from "../../components/Page";
import { DataTable, type Column } from "../../components/DataTable";
import { StatusPill, ErrorState, EmptyState } from "../../components/ui";

interface App {
  id: string; code: string; status: string; businessName: string; category: string | null;
  phone: string | null; plan: string | null; city: string | null; salespersonName: string | null;
  leadCode: string | null; createdAt: string;
}

const STATUSES = ["Application Received", "Under Review", "Contact Scheduled", "Requirements Confirmed", "Proposal Sent", "Waiting for Approval", "Approved", "Website in Progress", "Ready for Review", "Launched", "Not Proceeding"];

export default function Applications() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [rows, setRows] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true); setError(null);
    api.get<{ items: App[] }>(`/applications${qs({ q, status })}`).then((r) => setRows(r.items)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q, status]);

  const columns: Column<App>[] = [
    { id: "code", header: "Ref", cell: (a) => <span className="tnum font-semibold">{a.code}</span> },
    { id: "business", header: "Business", primary: true, cell: (a) => (
      <div><div className="font-medium">{a.businessName}</div>{a.category && <div className="text-xs" style={{ color: "var(--muted)" }}>{a.category}</div>}</div>
    ) },
    { id: "plan", header: "Plan", cell: (a) => a.plan ? a.plan[0].toUpperCase() + a.plan.slice(1) : "—" },
    { id: "sp", header: "Salesperson", hideMobile: true, cell: (a) => a.salespersonName ?? "—" },
    { id: "created", header: "Received", hideMobile: true, cell: (a) => fmtDate(a.createdAt) },
    { id: "status", header: "Status", cell: (a) => <StatusPill status={a.status} /> },
  ];

  return (
    <Page>
      <PageHeader title="Applications" subtitle="Website applications submitted from ignis.com" />
      <Toolbar>
        <input className="input" style={{ maxWidth: 240 }} placeholder="Search business, ref, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="All">All statuses</option>
          {STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Toolbar>
      {error ? <ErrorState message={error} onRetry={load} /> : (
        <DataTable columns={columns} rows={rows} rowKey={(a) => a.id} loading={loading}
          onRowClick={(a) => nav(`/sales/applications/${a.id}`)}
          empty={<EmptyState title="No applications yet" hint="They'll appear here as visitors apply on the website" />} />
      )}
    </Page>
  );
}
