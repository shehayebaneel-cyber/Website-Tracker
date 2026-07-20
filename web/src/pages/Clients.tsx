import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, qs } from "../lib/api";
import { useOptions } from "../lib/useOptions";
import type { Client, Paged } from "../lib/types";
import { money, fmtDate } from "../lib/format";
import { Page, PageHeader, Toolbar } from "../components/Page";
import { DataTable, Pagination, type Column, type Sort } from "../components/DataTable";
import { StatusPill, ErrorState, EmptyState } from "../components/ui";
import ClientForm from "./ClientForm";

export default function Clients() {
  const nav = useNavigate();
  const options = useOptions();
  const [params, setParams] = useSearchParams();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "All");
  const [plan, setPlan] = useState("All");
  const [sort, setSort] = useState<Sort>({ id: "code", desc: false });
  const [page, setPage] = useState(1);

  const [data, setData] = useState<Paged<Client> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    const query = qs({ q, status, plan, sort: sort.id, order: sort.desc ? "desc" : "asc", page, pageSize: 50 });
    api.get<Paged<Client>>(`/clients${query}`).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }

  // debounce search; reload on filter/sort/page change
  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, plan, sort, page]);

  useEffect(() => { setPage(1); }, [q, status, plan]);
  useEffect(() => {
    if (status === "All") params.delete("status"); else params.set("status", status);
    setParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const columns: Column<Client>[] = [
    { id: "code", header: "ID", sortable: true, primary: true, cell: (c) => <span className="tnum font-semibold">{c.code}</span> },
    { id: "businessName", header: "Business", sortable: true, cell: (c) => (
      <div>
        <div className="font-medium">{c.businessName}</div>
        {c.city && <div className="text-xs" style={{ color: "var(--muted)" }}>{c.city}</div>}
      </div>
    ) },
    { id: "servicePlan", header: "Plan", cell: (c) => c.servicePlan ?? "—" },
    { id: "monthlyFee", header: "Monthly", sortable: true, align: "right", cell: (c) => <span className="tnum">{money(c.monthlyFee)}</span> },
    { id: "outstanding", header: "Balance", align: "right", cell: (c) => (
      <span className="tnum font-semibold" style={{ color: (c.outstanding ?? 0) > 0 ? "var(--crit)" : "var(--ink-2)" }}>{money(c.outstanding ?? 0)}</span>
    ) },
    { id: "nextDueDate", header: "Next due", hideMobile: true, cell: (c) => fmtDate(c.nextDueDate) },
    { id: "websiteCount", header: "Sites", align: "center", hideMobile: true, cell: (c) => c.websiteCount ?? 0 },
    { id: "status", header: "Status", sortable: true, cell: (c) => <StatusPill status={c.status} /> },
  ];

  return (
    <Page>
      <PageHeader
        title="Clients"
        subtitle="Every client, their subscription and current balance"
        actions={<button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New client</button>}
      />

      <Toolbar>
        <input
          className="input"
          style={{ maxWidth: 260 }}
          placeholder="Search name, phone, ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input" style={{ width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="All">All statuses</option>
          {(options.clientStatus ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className="input" style={{ width: "auto" }} value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="All">All plans</option>
          {(options.servicePlan ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Toolbar>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(c) => c.id}
            sort={sort}
            onSort={setSort}
            loading={loading}
            onRowClick={(c) => nav(`/clients/${c.id}`)}
            empty={<EmptyState title="No clients found" hint="Adjust filters or add your first client" />}
          />
          {data && <Pagination page={data.page} pageCount={data.pageCount} total={data.total} onPage={setPage} />}
        </>
      )}

      {showForm && (
        <ClientForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSaved={(c) => { setShowForm(false); nav(`/clients/${c.id}`); }}
        />
      )}
    </Page>
  );
}
