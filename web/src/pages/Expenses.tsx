import { useEffect, useState } from "react";
import { api, qs } from "../lib/api";
import { useOptions } from "../lib/useOptions";
import type { Expense, Paged } from "../lib/types";
import { money, fmtDate, daysLabel } from "../lib/format";
import { Page, PageHeader, Toolbar } from "../components/Page";
import { DataTable, Pagination, type Column } from "../components/DataTable";
import { StatusPill, ErrorState, EmptyState } from "../components/ui";
import ExpenseForm from "./ExpenseForm";

export default function Expenses() {
  const options = useOptions();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<Expense> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showForm, setShowForm] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    api.get<Paged<Expense>>(`/expenses${qs({ q, category, page, pageSize: 50 })}`).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q, category, page]);
  useEffect(() => { setPage(1); }, [q, category]);

  const columns: Column<Expense>[] = [
    { id: "code", header: "Expense", primary: true, cell: (e) => <span className="tnum font-semibold">{e.code}</span> },
    { id: "expenseDate", header: "Date", cell: (e) => fmtDate(e.expenseDate) },
    { id: "category", header: "Category", cell: (e) => e.category },
    { id: "vendor", header: "Vendor", hideMobile: true, cell: (e) => e.vendor ?? "—" },
    { id: "recurring", header: "Recurring", hideMobile: true, cell: (e) => e.recurring ? <span className="flex flex-col"><span>{e.renewalFrequency}</span><span className="text-[11px]" style={{ color: "var(--muted)" }}>{daysLabel(e.nextRenewalDays)}</span></span> : "One time" },
    { id: "renewal", header: "Renewal", cell: (e) => e.recurring ? <StatusPill status={e.nextRenewalStatus} /> : <span style={{ color: "var(--muted)" }}>—</span> },
    { id: "amount", header: "Amount", align: "right", cell: (e) => <span className="tnum font-semibold">{money(e.amount)}</span> },
  ];

  return (
    <Page>
      <PageHeader title="Expenses" subtitle="Business and client-related costs"
        actions={<button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>+ New expense</button>} />
      <Toolbar>
        <input className="input" style={{ maxWidth: 240 }} placeholder="Search vendor, description…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ width: "auto" }} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="All">All categories</option>
          {(options.expenseCategory ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Toolbar>

      {error ? <ErrorState message={error} onRetry={load} /> : (
        <>
          <DataTable columns={columns} rows={data?.items ?? []} rowKey={(e) => e.id} loading={loading}
            onRowClick={(e) => { setEditing(e); setShowForm(true); }}
            empty={<EmptyState title="No expenses" hint="Track your first cost" />} />
          {data && <Pagination page={data.page} pageCount={data.pageCount} total={data.total} onPage={setPage} />}
        </>
      )}
      {showForm && <ExpenseForm open={showForm} existing={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </Page>
  );
}
