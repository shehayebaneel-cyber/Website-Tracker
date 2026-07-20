import { useEffect, useState } from "react";
import { api, qs } from "../lib/api";
import { fmtDate } from "../lib/format";
import { Page, PageHeader, Toolbar } from "../components/Page";
import { Card, Spinner, ErrorState, EmptyState } from "../components/ui";
import { Pagination } from "../components/DataTable";

interface Entry { id: string; entityType: string; action: string; summary: string; user: string; createdAt: string }
interface Data { items: Entry[]; total: number; page: number; pageCount: number }

const TYPES = ["All", "Client", "Website", "Invoice", "Payment", "Expense", "SupportTicket", "User", "Setting"];

export default function Activity() {
  const [type, setType] = useState("All");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true); setError(null);
    api.get<Data>(`/activity${qs({ entityType: type, page, pageSize: 50 })}`).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(load, [type, page]);
  useEffect(() => { setPage(1); }, [type]);

  function when(iso: string) {
    const d = new Date(iso);
    return `${fmtDate(iso)} ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  }

  return (
    <Page>
      <PageHeader title="Activity Log" subtitle="Who changed what, and when" />
      <Toolbar>
        <select className="input" style={{ width: "auto" }} value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => <option key={t} value={t}>{t === "All" ? "All types" : t}</option>)}
        </select>
      </Toolbar>

      {error ? <ErrorState message={error} onRetry={load} /> : loading && !data ? (
        <div className="py-16 text-center"><span className="inline-block"><Spinner /></span></div>
      ) : data && (
        <>
          {data.items.length === 0 ? <Card className="p-2"><EmptyState title="No activity yet" /></Card> : (
            <Card>
              {data.items.map((e) => (
                <div key={e.id} className="flex items-center gap-3 border-b px-4 py-2.5 last:border-0" style={{ borderColor: "var(--line-2)" }}>
                  <span className="pill pill-neut shrink-0">{e.entityType}</span>
                  <span className="min-w-0 flex-1 text-sm" style={{ color: "var(--ink)" }}>{e.summary}</span>
                  <span className="shrink-0 text-xs" style={{ color: "var(--muted)" }}>{e.user} · {when(e.createdAt)}</span>
                </div>
              ))}
            </Card>
          )}
          {data && <Pagination page={data.page} pageCount={data.pageCount} total={data.total} onPage={setPage} />}
        </>
      )}
    </Page>
  );
}
