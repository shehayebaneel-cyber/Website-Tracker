import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, qs } from "../lib/api";
import { useOptions } from "../lib/useOptions";
import type { Payment, Paged } from "../lib/types";
import { money, fmtDate } from "../lib/format";
import { Page, PageHeader, Toolbar } from "../components/Page";
import { DataTable, Pagination, type Column } from "../components/DataTable";
import { StatusPill, ErrorState, EmptyState } from "../components/ui";
import PaymentForm from "./PaymentForm";

export default function Payments() {
  const nav = useNavigate();
  const options = useOptions();
  const [q, setQ] = useState("");
  const [method, setMethod] = useState("All");
  const [depositStatus, setDepositStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<Payment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    api.get<Paged<Payment>>(`/payments${qs({ q, method, depositStatus, page, pageSize: 50 })}`).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q, method, depositStatus, page]);
  useEffect(() => { setPage(1); }, [q, method, depositStatus]);

  const columns: Column<Payment>[] = [
    { id: "code", header: "Payment", primary: true, cell: (p) => <span className="tnum font-semibold">{p.code}</span> },
    { id: "paymentDate", header: "Date", cell: (p) => fmtDate(p.paymentDate) },
    { id: "client", header: "Client", cell: (p) => p.clientName },
    { id: "invoice", header: "Invoice", hideMobile: true, cell: (p) => p.invoiceCode ?? "—" },
    { id: "method", header: "Method", cell: (p) => p.method },
    { id: "deposit", header: "Deposit", hideMobile: true, cell: (p) => <StatusPill status={p.depositStatus} /> },
    { id: "amount", header: "Amount", align: "right", cell: (p) => <span className="tnum font-semibold" style={{ color: "var(--good)" }}>{money(p.amount)}</span> },
  ];

  return (
    <Page>
      <PageHeader title="Payments" subtitle="Every payment received"
        actions={<button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Record payment</button>} />
      <Toolbar>
        <input className="input" style={{ maxWidth: 240 }} placeholder="Search payment, reference, client…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ width: "auto" }} value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="All">All methods</option>
          {(options.paymentMethod ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className="input" style={{ width: "auto" }} value={depositStatus} onChange={(e) => setDepositStatus(e.target.value)}>
          <option value="All">All deposits</option>
          {(options.depositStatus ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Toolbar>

      {error ? <ErrorState message={error} onRetry={load} /> : (
        <>
          <DataTable columns={columns} rows={data?.items ?? []} rowKey={(p) => p.id} loading={loading}
            onRowClick={(p) => nav(`/clients/${p.clientId}`)}
            empty={<EmptyState title="No payments yet" hint="Record your first payment" />} />
          {data && <Pagination page={data.page} pageCount={data.pageCount} total={data.total} onPage={setPage} />}
        </>
      )}
      {showForm && <PaymentForm open={showForm} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </Page>
  );
}
