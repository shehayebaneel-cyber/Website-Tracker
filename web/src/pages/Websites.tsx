import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, qs } from "../lib/api";
import { useOptions } from "../lib/useOptions";
import type { Website, Paged } from "../lib/types";
import { fmtDate, daysLabel } from "../lib/format";
import { Page, PageHeader, Toolbar } from "../components/Page";
import { DataTable, Pagination, type Column, type Sort } from "../components/DataTable";
import { StatusPill, ErrorState, EmptyState } from "../components/ui";

export default function Websites() {
  const nav = useNavigate();
  const options = useOptions();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState<Sort>({ id: "code", desc: false });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<Website> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    const query = qs({ q, status, sort: sort.id, order: sort.desc ? "desc" : "asc", page, pageSize: 50 });
    api.get<Paged<Website>>(`/websites${query}`).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, sort, page]);
  useEffect(() => { setPage(1); }, [q, status]);

  const columns: Column<Website>[] = [
    { id: "code", header: "ID", sortable: true, primary: true, cell: (w) => <span className="tnum font-semibold">{w.code}</span> },
    { id: "client", header: "Client / project", cell: (w) => (
      <div>
        <div className="font-medium">{w.clientName}</div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>{w.projectName || "—"}</div>
      </div>
    ) },
    { id: "status", header: "Status", sortable: true, cell: (w) => <StatusPill status={w.status} /> },
    { id: "domain", header: "Domain", sortable: true, cell: (w) => (
      <div className="flex flex-col gap-0.5"><StatusPill status={w.domainStatus} /><span className="text-[11px]" style={{ color: "var(--muted)" }}>{daysLabel(w.domainDaysRemaining)}</span></div>
    ) },
    { id: "hosting", header: "Hosting", cell: (w) => (
      <div className="flex flex-col gap-0.5"><StatusPill status={w.hostingStatus} /><span className="text-[11px]" style={{ color: "var(--muted)" }}>{daysLabel(w.hostingDaysRemaining)}</span></div>
    ) },
    { id: "ssl", header: "SSL", cell: (w) => (
      <div className="flex flex-col gap-0.5"><StatusPill status={w.sslStatus} /><span className="text-[11px]" style={{ color: "var(--muted)" }}>{daysLabel(w.sslDaysRemaining)}</span></div>
    ) },
    { id: "launchDate", header: "Launched", hideMobile: true, cell: (w) => fmtDate(w.launchDate) },
  ];

  return (
    <Page>
      <PageHeader title="Websites" subtitle="Every website you've built, with domain, hosting and SSL renewal tracking" />
      <Toolbar>
        <input className="input" style={{ maxWidth: 260 }} placeholder="Search project, domain, client…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="All">All statuses</option>
          {(options.websiteStatus ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Toolbar>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(w) => w.id}
            sort={sort}
            onSort={setSort}
            loading={loading}
            onRowClick={(w) => nav(`/websites/${w.id}`)}
            empty={<EmptyState title="No websites found" hint="Add a website from a client's profile" />}
          />
          {data && <Pagination page={data.page} pageCount={data.pageCount} total={data.total} onPage={setPage} />}
        </>
      )}
    </Page>
  );
}
