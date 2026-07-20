import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { canAccess } from "../../lib/perms";
import { useOptions } from "../../lib/useOptions";
import type { Payout, Salesperson } from "../../lib/salesTypes";
import { money, fmtDate } from "../../lib/format";
import { Page, PageHeader } from "../../components/Page";
import { DataTable, type Column } from "../../components/DataTable";
import { StatusPill, ErrorState, EmptyState, Field } from "../../components/ui";
import { Modal } from "../../components/Modal";

function thisMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Payouts() {
  const { user } = useAuth();
  const isAdmin = canAccess(user?.role, "salesTeam");
  const [items, setItems] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [viewing, setViewing] = useState<Payout | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.get<{ items: Payout[] }>("/payouts").then((r) => setItems(r.items)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function openStatement(id: string) {
    try { const r = await api.get<{ payout: Payout }>(`/payouts/${id}`); setViewing(r.payout); }
    catch (e: any) { setError(e.message); }
  }

  const columns: Column<Payout>[] = [
    { id: "code", header: "Payout", primary: true, cell: (p) => <span className="tnum font-semibold">{p.code}</span> },
    ...(isAdmin ? [{ id: "sp", header: "Salesperson", cell: (p: Payout) => p.salespersonName } as Column<Payout>] : []),
    { id: "period", header: "Period", hideMobile: true, cell: (p) => p.month },
    { id: "net", header: "Net", align: "right", cell: (p) => <span className="tnum font-semibold">{money(p.netAmount)}</span> },
    { id: "paid", header: "Paid on", hideMobile: true, cell: (p) => (p.paidDate ? fmtDate(p.paidDate) : "—") },
    { id: "status", header: "Status", cell: (p) => <StatusPill status={p.status} /> },
  ];

  return (
    <Page>
      <PageHeader
        title="Payouts"
        subtitle={isAdmin ? "Pay salespeople their approved commissions" : "Your commission payouts"}
        actions={isAdmin ? <button className="btn btn-primary" onClick={() => setBuilding(true)}>Build payout</button> : undefined}
      />
      {error ? <ErrorState message={error} onRetry={load} /> : (
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(p) => p.id}
          loading={loading}
          onRowClick={(p) => openStatement(p.id)}
          empty={<EmptyState title="No payouts yet" hint={isAdmin ? "Build a payout to pay approved commissions" : "You have no payouts yet"} />}
        />
      )}
      {building && <BuildModal onClose={() => setBuilding(false)} onBuilt={(p) => { setBuilding(false); load(); setViewing(p); }} />}
      {viewing && <StatementModal payout={viewing} isAdmin={isAdmin} onClose={() => setViewing(null)} onChanged={(p) => { setViewing(p); load(); }} />}
    </Page>
  );
}

function BuildModal({ onClose, onBuilt }: { onClose: () => void; onBuilt: (p: Payout) => void }) {
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [salespersonId, setSalespersonId] = useState("");
  const [month, setMonth] = useState(thisMonthKey());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ items: Salesperson[] }>("/salespeople").then((r) => setSalespeople(r.items.filter((s) => s.status === "Active"))).catch(() => {});
  }, []);

  async function build() {
    setBusy(true); setError(null);
    try { const r = await api.post<{ payout: Payout }>("/payouts/build", { salespersonId, month }); onBuilt(r.payout); }
    catch (e: any) { setError(e.message || "Could not build payout"); } finally { setBusy(false); }
  }

  return (
    <Modal open onClose={onClose} title="Build a payout"
      footer={<>
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={build} disabled={busy || !salespersonId}>{busy ? "Building…" : "Build"}</button>
      </>}>
      {error && <div className="pill pill-crit mb-3 w-full justify-center py-2">{error}</div>}
      <Field label="Salesperson">
        <select className="input" value={salespersonId} onChange={(e) => setSalespersonId(e.target.value)}>
          <option value="">Select…</option>
          {salespeople.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.fullName}</option>)}
        </select>
      </Field>
      <div className="mt-3"><Field label="Pay period (month)"><input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value || thisMonthKey())} /></Field></div>
      <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>Bundles every <b>Approved</b> commission that isn't already in a payout.</p>
    </Modal>
  );
}

function StatementModal({ payout, isAdmin, onClose, onChanged }: { payout: Payout; isAdmin: boolean; onClose: () => void; onChanged: (p: Payout) => void }) {
  const options = useOptions();
  const [method, setMethod] = useState(payout.method ?? payout.salespersonPaymentMethod ?? "");
  const [reference, setReference] = useState(payout.reference ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const paid = payout.status === "Paid";
  const cancelled = payout.status === "Cancelled";

  async function pay() {
    setBusy("pay"); setError(null);
    try { const r = await api.post<{ payout: Payout }>(`/payouts/${payout.id}/pay`, { method: method || null, reference: reference || null }); onChanged(r.payout); }
    catch (e: any) { setError(e.message); } finally { setBusy(null); }
  }
  async function cancel() {
    setBusy("cancel"); setError(null);
    try { await api.post(`/payouts/${payout.id}/cancel`, {}); onClose(); }
    catch (e: any) { setError(e.message); setBusy(null); }
  }

  return (
    <Modal open onClose={onClose} wide title={`Payout ${payout.code}`}
      footer={<>
        <button className="btn" onClick={onClose}>Close</button>
        {isAdmin && !paid && !cancelled && <button className="btn" onClick={cancel} disabled={busy === "cancel"}>{busy === "cancel" ? "…" : "Cancel payout"}</button>}
        {isAdmin && !paid && !cancelled && <button className="btn btn-primary" onClick={pay} disabled={busy === "pay"}>{busy === "pay" ? "Saving…" : "Mark as paid"}</button>}
      </>}>
      {error && <div className="pill pill-crit mb-3 w-full justify-center py-2">{error}</div>}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{payout.salespersonName}</div>
          <div className="text-sm" style={{ color: "var(--muted)" }}>Period {payout.month} · <StatusPill status={payout.status} /></div>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: "var(--muted)" }}>Net payable</div>
          <div className="tnum text-2xl font-bold">{money(payout.netAmount)}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead><tr className="border-b" style={{ background: "var(--surface-2)" }}>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Client / website</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Month</th>
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Subscription</th>
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Commission</th>
          </tr></thead>
          <tbody>
            {(payout.lines ?? []).map((l) => (
              <tr key={l.id} className="border-b" style={{ borderColor: "var(--line-2)" }}>
                <td className="px-3 py-2">{l.clientName} · <span style={{ color: "var(--muted)" }}>{l.websiteCode}</span></td>
                <td className="px-3 py-2">{l.month}</td>
                <td className="px-3 py-2 text-right tnum">{money(l.subscriptionAmount)}</td>
                <td className="px-3 py-2 text-right tnum">{money(l.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr>
            <td className="px-3 py-2 font-semibold" colSpan={3}>Total earned{payout.totalAdjustments !== 0 ? ` (adjustments ${money(payout.totalAdjustments)})` : ""}</td>
            <td className="px-3 py-2 text-right font-bold tnum">{money(payout.netAmount)}</td>
          </tr></tfoot>
        </table>
      </div>

      {paid ? (
        <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>Paid {payout.paidDate ? fmtDate(payout.paidDate) : ""} via {payout.method || "—"}{payout.reference ? ` · ref ${payout.reference}` : ""}.</p>
      ) : isAdmin && !cancelled ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Payment method">
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="">—</option>
              {(options.paymentMethod ?? ["Cash", "Whish", "Bank Transfer"]).map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Reference / proof"><input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Whish txn, transfer ref…" /></Field>
        </div>
      ) : null}
    </Modal>
  );
}
