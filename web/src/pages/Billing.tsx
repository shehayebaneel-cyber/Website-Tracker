import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, qs } from "../lib/api";
import { useOptions } from "../lib/useOptions";
import type { Invoice, Paged } from "../lib/types";
import { money, fmtMonth } from "../lib/format";
import { Page, PageHeader, Toolbar } from "../components/Page";
import { DataTable, Pagination, type Column, type Sort } from "../components/DataTable";
import { StatusPill, ErrorState, EmptyState } from "../components/ui";
import InvoiceForm from "./InvoiceForm";
import GenerateInvoices from "./GenerateInvoices";

const INVOICE_STATUSES = ["No Charge", "Due", "Partially Paid", "Partial – Overdue", "Overdue", "Paid On Time", "Paid Late"];

export default function Billing() {
  const nav = useNavigate();
  const options = useOptions();
  const [q, setQ] = useState("");
  const [chargeType, setChargeType] = useState("All");
  const [status, setStatus] = useState("All");
  const [sort] = useState<Sort>({ id: "invoiceDate", desc: true });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<Invoice> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showGen, setShowGen] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    api.get<Paged<Invoice>>(`/invoices${qs({ q, chargeType, status, page, pageSize: 50 })}`).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q, chargeType, status, page]);
  useEffect(() => { setPage(1); }, [q, chargeType, status]);

  const columns: Column<Invoice>[] = [
    { id: "code", header: "Invoice", primary: true, cell: (i) => <span className="tnum font-semibold">{i.code}</span> },
    { id: "client", header: "Client", cell: (i) => i.clientName },
    { id: "billingMonth", header: "Month", cell: (i) => fmtMonth(i.billingMonth) },
    { id: "chargeType", header: "Type", hideMobile: true, cell: (i) => i.chargeType },
    { id: "amountDue", header: "Due", align: "right", cell: (i) => <span className="tnum">{money(i.amountDue)}</span> },
    { id: "amountPaid", header: "Paid", align: "right", hideMobile: true, cell: (i) => <span className="tnum">{money(i.amountPaid)}</span> },
    { id: "balance", header: "Balance", align: "right", cell: (i) => <span className="tnum font-semibold" style={{ color: i.balance > 0 ? "var(--crit)" : "var(--ink-2)" }}>{money(i.balance)}</span> },
    { id: "status", header: "Status", cell: (i) => <StatusPill status={i.status} /> },
  ];

  return (
    <Page>
      <PageHeader
        title="Billing & Invoices"
        subtitle="Every charge issued to clients"
        actions={
          <>
            <button className="btn" onClick={() => setShowGen(true)}>Generate month</button>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New invoice</button>
          </>
        }
      />
      <Toolbar>
        <input className="input" style={{ maxWidth: 240 }} placeholder="Search invoice, client…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ width: "auto" }} value={chargeType} onChange={(e) => setChargeType(e.target.value)}>
          <option value="All">All types</option>
          {(options.chargeType ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className="input" style={{ width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="All">All statuses</option>
          {INVOICE_STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Toolbar>

      {error ? <ErrorState message={error} onRetry={load} /> : (
        <>
          <DataTable columns={columns} rows={data?.items ?? []} rowKey={(i) => i.id} sort={sort} loading={loading}
            onRowClick={(i) => nav(`/clients/${i.clientId}`)}
            empty={<EmptyState title="No invoices" hint="Create one or generate the month" />} />
          {data && <Pagination page={data.page} pageCount={data.pageCount} total={data.total} onPage={setPage} />}
        </>
      )}

      {showForm && <InvoiceForm open={showForm} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {showGen && <GenerateInvoices open={showGen} onClose={() => setShowGen(false)} onDone={load} />}
    </Page>
  );
}
