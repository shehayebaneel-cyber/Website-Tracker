import { useEffect, useState } from "react";
import { api, qs } from "../lib/api";
import { useOptions } from "../lib/useOptions";
import type { Ticket, Paged } from "../lib/types";
import { fmtDate } from "../lib/format";
import { Page, PageHeader, Toolbar } from "../components/Page";
import { DataTable, Pagination, type Column } from "../components/DataTable";
import { StatusPill, ErrorState, EmptyState } from "../components/ui";
import TicketForm from "./TicketForm";

export default function Support() {
  const options = useOptions();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<Ticket> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [showForm, setShowForm] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    api.get<Paged<Ticket>>(`/support${qs({ q, status, priority, page, pageSize: 50 })}`).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q, status, priority, page]);
  useEffect(() => { setPage(1); }, [q, status, priority]);

  const columns: Column<Ticket>[] = [
    { id: "code", header: "Ticket", primary: true, cell: (t) => <span className="tnum font-semibold">{t.code}</span> },
    { id: "client", header: "Client", cell: (t) => (
      <span className="flex flex-wrap items-center gap-1.5">
        <span>{t.clientName}</span>
        {t.unlinked
          ? <span className="pill pill-attn" title="Submitted from the website — not yet linked to a client">Unlinked</span>
          : t.fromWebsite && <span className="pill" title="Submitted from the website">Website</span>}
      </span>
    ) },
    { id: "summary", header: "Summary", cell: (t) => <span>{t.summary}{t.unbilledExtraWork && <span className="pill pill-attn ml-2">Unbilled</span>}</span> },
    { id: "priority", header: "Priority", cell: (t) => <StatusPill status={t.priority} /> },
    { id: "status", header: "Status", cell: (t) => <StatusPill status={t.status} /> },
    { id: "deadline", header: "Deadline", hideMobile: true, cell: (t) => <span className="flex flex-col gap-0.5"><StatusPill status={t.deadlineStatus} /><span className="text-[11px]" style={{ color: "var(--muted)" }}>{t.dueDate ? fmtDate(t.dueDate) : ""}</span></span> },
    { id: "hours", header: "Hrs", align: "right", hideMobile: true, cell: (t) => <span className="tnum">{t.hoursSpent}</span> },
  ];

  return (
    <Page>
      <PageHeader title="Support & Work Requests" subtitle="Every client request, change and task"
        actions={<button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>+ New ticket</button>} />
      <Toolbar>
        <input className="input" style={{ maxWidth: 240 }} placeholder="Search summary, client…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="All">All statuses</option>
          {(options.supportStatus ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className="input" style={{ width: "auto" }} value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="All">All priorities</option>
          {(options.priority ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Toolbar>

      {error ? <ErrorState message={error} onRetry={load} /> : (
        <>
          <DataTable columns={columns} rows={data?.items ?? []} rowKey={(t) => t.id} loading={loading}
            onRowClick={(t) => { setEditing(t); setShowForm(true); }}
            empty={<EmptyState title="No tickets" hint="Log your first request" />} />
          {data && <Pagination page={data.page} pageCount={data.pageCount} total={data.total} onPage={setPage} />}
        </>
      )}
      {showForm && <TicketForm open={showForm} existing={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </Page>
  );
}
