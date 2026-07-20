import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Assignment } from "../../lib/salesTypes";
import { money, fmtMonth } from "../../lib/format";
import { Page, PageHeader } from "../../components/Page";
import { DataTable, type Column } from "../../components/DataTable";
import { StatusPill, ErrorState, EmptyState } from "../../components/ui";

// A salesperson's own assigned clients (scoped server-side).
export default function SalesClients() {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true); setError(null);
    api.get<{ items: Assignment[] }>("/assignments").then((r) => setRows(r.items)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  const columns: Column<Assignment>[] = [
    { id: "client", header: "Client", primary: true, cell: (a) => <div className="font-medium">{a.clientName}</div> },
    { id: "monthly", header: "Monthly", align: "right", cell: (a) => <span className="tnum">{money(a.monthlyFee ?? 0)}</span> },
    { id: "commission", header: "My commission", align: "right", cell: (a) => <span className="tnum" style={{ color: "var(--attn)" }}>{a.commissionMethod === "Fixed" ? money(a.commissionAmount ?? 0) : `${a.commissionPercent}%`}</span> },
    { id: "since", header: "Since", cell: (a) => fmtMonth(a.effectiveBillingMonth) },
    { id: "status", header: "Status", cell: (a) => <StatusPill status={a.status} /> },
  ];

  return (
    <Page>
      <PageHeader title="My Clients" subtitle="Clients currently assigned to you" />
      {error ? <ErrorState message={error} onRetry={load} /> : (
        <DataTable columns={columns} rows={rows} rowKey={(a) => a.id} loading={loading}
          empty={<EmptyState title="No assigned clients yet" hint="Convert a lead to get your first client" />} />
      )}
    </Page>
  );
}
