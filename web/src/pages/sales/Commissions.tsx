import { useEffect, useState } from "react";
import { api, qs } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { canAccess } from "../../lib/perms";
import { useOptions } from "../../lib/useOptions";
import type { Commission, CommissionSummary } from "../../lib/salesTypes";
import { money } from "../../lib/format";
import { Page, PageHeader, Toolbar } from "../../components/Page";
import { DataTable, type Column } from "../../components/DataTable";
import { StatusPill, ErrorState, EmptyState } from "../../components/ui";

function thisMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const smallBtn = { padding: "0.35rem 0.7rem", fontSize: "0.8rem" } as const;

export default function Commissions() {
  const { user } = useAuth();
  const isAdmin = canAccess(user?.role, "salesTeam"); // OWNER / MANAGER can generate + act
  const options = useOptions();
  const [month, setMonth] = useState(thisMonthKey());
  const [status, setStatus] = useState("All");
  const [data, setData] = useState<{ items: Commission[]; summary: CommissionSummary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.get<{ items: Commission[]; summary: CommissionSummary }>(`/commissions${qs({ month, status })}`)
      .then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month, status]);

  async function generate() {
    setBusy("generate"); setError(null);
    try { await api.post("/commissions/generate", { month }); load(); }
    catch (e: any) { setError(e.message); } finally { setBusy(null); }
  }
  async function act(id: string, action: string, body?: any) {
    setBusy(id + action); setError(null);
    try { await api.post(`/commissions/${id}/${action}`, body); load(); }
    catch (e: any) { setError(e.message); } finally { setBusy(null); }
  }

  const s = data?.summary;
  const columns: Column<Commission>[] = [
    { id: "code", header: "Ref", primary: true, cell: (c) => <span className="tnum font-semibold">{c.code}</span> },
    { id: "client", header: "Client / website", cell: (c) => (
      <div>
        <div>{c.clientName}</div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>{c.websiteCode} · {c.websiteName || "Website"}</div>
      </div>
    ) },
    ...(isAdmin ? [{ id: "sp", header: "Salesperson", hideMobile: true, cell: (c: Commission) => c.salespersonName } as Column<Commission>] : []),
    { id: "sub", header: "Subscription", align: "right", hideMobile: true, cell: (c) => <span className="tnum">{money(c.subscriptionAmount)}</span> },
    { id: "amount", header: "Commission", align: "right", cell: (c) => <span className="tnum font-semibold">{money(c.amount)}</span> },
    { id: "status", header: "Status", cell: (c) => (
      <div className="flex flex-col gap-0.5">
        <StatusPill status={c.status} />
        {c.statusReason && <span className="text-[11px]" style={{ color: "var(--muted)" }}>{c.statusReason}</span>}
      </div>
    ) },
    ...(isAdmin ? [{ id: "actions", header: "", cell: (c: Commission) => <RowActions c={c} busy={busy} act={act} /> } as Column<Commission>] : []),
  ];

  return (
    <Page>
      <PageHeader
        title="Commissions"
        subtitle={isAdmin ? "Review, approve and manage monthly commissions" : "Your monthly commissions"}
        actions={isAdmin ? (
          <button className="btn btn-primary" onClick={generate} disabled={busy === "generate"}>
            {busy === "generate" ? "Generating…" : "Generate & review"}
          </button>
        ) : undefined}
      />

      {s && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Tile label="Expected" value={s.expected} />
          <Tile label="Eligible" value={s.eligible} />
          <Tile label="Approved" value={s.approved} />
          <Tile label="Paid" value={s.paid} />
          <Tile label="Under review" value={s.underReview} />
          <Tile label="On hold" value={s.held} />
        </div>
      )}

      <Toolbar>
        <label className="flex items-center gap-2">
          <span className="label">Month</span>
          <input className="input" style={{ width: "auto" }} type="month" value={month} onChange={(e) => setMonth(e.target.value || thisMonthKey())} />
        </label>
        <select className="input" style={{ width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="All">All statuses</option>
          {(options.commissionStatus ?? []).map((o) => <option key={o}>{o}</option>)}
        </select>
      </Toolbar>

      {error ? <ErrorState message={error} onRetry={load} /> : (
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(c) => c.id}
          loading={loading}
          empty={<EmptyState title="No commissions" hint={isAdmin ? "Click Generate & review to create this month's rows" : "Nothing here yet"} />}
        />
      )}
    </Page>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-3">
      <div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="tnum text-lg font-semibold">{money(value)}</div>
    </div>
  );
}

function RowActions({ c, busy, act }: { c: Commission; busy: string | null; act: (id: string, a: string, body?: any) => void }) {
  const on = (a: string) => busy === c.id + a;
  const canApprove = c.status === "Eligible" || c.status === "Under Review" || c.status === "Held";
  const canHold = !["Held", "Paid", "Included in Payout", "Cancelled", "Reversed"].includes(c.status);
  return (
    <div className="flex flex-wrap justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {canApprove && <button className="btn btn-primary" style={smallBtn} disabled={on("approve")} onClick={() => act(c.id, "approve")}>Approve</button>}
      {canHold && <button className="btn" style={smallBtn} disabled={on("hold")} onClick={() => act(c.id, "hold", { reason: "Held for review" })}>Hold</button>}
      {c.status === "Held" && <button className="btn" style={smallBtn} disabled={on("release")} onClick={() => act(c.id, "release")}>Release</button>}
    </div>
  );
}
