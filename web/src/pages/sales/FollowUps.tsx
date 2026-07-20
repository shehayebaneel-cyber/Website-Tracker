import { useEffect, useState } from "react";
import { api, qs } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { canAccess } from "../../lib/perms";
import { useOptions } from "../../lib/useOptions";
import type { FollowUpRow, FollowUpSummary } from "../../lib/salesTypes";
import { fmtDate } from "../../lib/format";
import { Page, PageHeader, Toolbar } from "../../components/Page";
import { DataTable, type Column } from "../../components/DataTable";
import { StatusPill, ErrorState, EmptyState, Field } from "../../components/ui";
import { Modal } from "../../components/Modal";

function thisMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function FollowUps() {
  const { user } = useAuth();
  const isAdmin = canAccess(user?.role, "salesTeam");
  const [month, setMonth] = useState(thisMonthKey());
  const [data, setData] = useState<{ rows: FollowUpRow[]; summary: FollowUpSummary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FollowUpRow | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.get<{ rows: FollowUpRow[]; summary: FollowUpSummary }>(`/followups${qs({ month })}`)
      .then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month]);

  const s = data?.summary;
  const columns: Column<FollowUpRow>[] = [
    { id: "client", header: "Client", primary: true, cell: (r) => (
      <div><div className="font-medium">{r.businessName}</div><div className="text-xs" style={{ color: "var(--muted)" }}>{r.clientCode}</div></div>
    ) },
    ...(isAdmin ? [{ id: "sp", header: "Salesperson", hideMobile: true, cell: (r: FollowUpRow) => r.salespersonName } as Column<FollowUpRow>] : []),
    { id: "contact", header: "Last contact", hideMobile: true, cell: (r) => r.followUp?.contactedDate
      ? <span>{fmtDate(r.followUp.contactedDate)}{r.followUp.method ? ` · ${r.followUp.method}` : ""}</span>
      : <span style={{ color: "var(--muted)" }}>—</span> },
    { id: "sat", header: "Satisfaction", cell: (r) => r.followUp?.satisfaction ? <StatusPill status={r.followUp.satisfaction} /> : <span style={{ color: "var(--muted)" }}>—</span> },
    { id: "flags", header: "Flags", hideMobile: true, cell: (r) => <Flags r={r} /> },
    { id: "status", header: "Status", cell: (r) => (
      <div className="flex flex-col items-start gap-0.5">
        <StatusPill status={r.dueStatus} />
        {r.atRisk && <span className="pill pill-crit">At risk</span>}
      </div>
    ) },
    { id: "action", header: "", cell: (r) => (
      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
        <button className="btn" style={{ padding: "0.35rem 0.7rem", fontSize: "0.8rem" }} onClick={() => setEditing(r)}>
          {r.followUp ? "Update" : "Log"}
        </button>
      </div>
    ) },
  ];

  return (
    <Page>
      <PageHeader title="Client follow-ups" subtitle={isAdmin ? "Monthly check-ins across the team — overdue and at-risk clients" : "Your monthly check-ins with assigned clients"} />

      {s && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Tile label="Clients" value={s.total} />
          <Tile label="Done" value={s.done} tone="good" />
          <Tile label="Due" value={s.due} tone="warn" />
          <Tile label="Overdue" value={s.overdue} tone="crit" />
          <Tile label="At risk" value={s.atRisk} tone="crit" />
        </div>
      )}

      <Toolbar>
        <label className="flex items-center gap-2">
          <span className="label">Month</span>
          <input className="input" style={{ width: "auto" }} type="month" value={month} onChange={(e) => setMonth(e.target.value || thisMonthKey())} />
        </label>
      </Toolbar>

      {error ? <ErrorState message={error} onRetry={load} /> : (
        <DataTable
          columns={columns}
          rows={data?.rows ?? []}
          rowKey={(r) => r.clientId}
          loading={loading}
          onRowClick={(r) => setEditing(r)}
          empty={<EmptyState title="No assigned clients" hint="Clients you manage will appear here each month" />}
        />
      )}

      {editing && (
        <FollowUpModal
          row={editing}
          month={month}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </Page>
  );
}

function Flags({ r }: { r: FollowUpRow }) {
  const f = r.followUp;
  if (!f) return <span style={{ color: "var(--muted)" }}>—</span>;
  const items: [boolean, string, string][] = [
    [f.needsUpdate, "Needs update", "pill-warn"],
    [f.hasTechnicalIssue, "Tech issue", "pill-attn"],
    [f.mayCancel, "May cancel", "pill-crit"],
    [f.upsellOpportunity, "Upsell", "pill-good"],
  ];
  const shown = items.filter(([on]) => on);
  if (!shown.length) return <span style={{ color: "var(--muted)" }}>—</span>;
  return <div className="flex flex-wrap gap-1">{shown.map(([, label, cls]) => <span key={label} className={`pill ${cls}`}>{label}</span>)}</div>;
}

function Tile({ label, value, tone }: { label: string; value: number; tone?: string }) {
  const color = tone === "good" ? "var(--good, #1a8f5c)" : tone === "warn" ? "var(--warn, #c26a1b)" : tone === "crit" ? "var(--crit, #c0392b)" : undefined;
  return (
    <div className="card p-3">
      <div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="tnum text-lg font-semibold" style={{ color: value > 0 ? color : undefined }}>{value}</div>
    </div>
  );
}

function FollowUpModal({ row, month, onClose, onSaved }: { row: FollowUpRow; month: string; onClose: () => void; onSaved: () => void }) {
  const options = useOptions();
  const f = row.followUp;
  const [d, setD] = useState({
    contactedDate: f?.contactedDate ? f.contactedDate.slice(0, 10) : todayInput(),
    method: f?.method ?? "",
    satisfaction: f?.satisfaction ?? "",
    needsUpdate: f?.needsUpdate ?? false,
    hasTechnicalIssue: f?.hasTechnicalIssue ?? false,
    mayCancel: f?.mayCancel ?? false,
    upsellOpportunity: f?.upsellOpportunity ?? false,
    upsellNote: f?.upsellNote ?? "",
    notes: f?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof d, v: any) => setD((p) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true); setError(null);
    try {
      await api.post("/followups", { clientId: row.clientId, month, ...d, upsellNote: d.upsellNote || null, notes: d.notes || null, method: d.method || null, satisfaction: d.satisfaction || null });
      onSaved();
    } catch (e: any) { setError(e.message || "Could not save follow-up"); } finally { setBusy(false); }
  }

  return (
    <Modal open onClose={onClose} title={`Follow-up — ${row.businessName}`}
      footer={<>
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save follow-up"}</button>
      </>}>
      {error && <div className="pill pill-crit mb-3 w-full justify-center py-2">{error}</div>}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Date contacted"><input className="input" type="date" value={d.contactedDate} onChange={(e) => set("contactedDate", e.target.value)} /></Field>
        <Field label="How">
          <select className="input" value={d.method} onChange={(e) => set("method", e.target.value)}>
            <option value="">—</option>
            {(options.contactMethod ?? ["WhatsApp", "Phone", "Email", "In Person"]).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Client satisfaction">
            <select className="input" value={d.satisfaction} onChange={(e) => set("satisfaction", e.target.value)}>
              <option value="">—</option>
              {(options.clientSatisfaction ?? ["Very Satisfied", "Satisfied", "Neutral", "Unsatisfied", "At Risk", "No Response"]).map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Check label="Wants a website update" on={d.needsUpdate} set={(v) => set("needsUpdate", v)} />
        <Check label="Reported a technical problem" on={d.hasTechnicalIssue} set={(v) => set("hasTechnicalIssue", v)} />
        <Check label="May cancel / at risk" on={d.mayCancel} set={(v) => set("mayCancel", v)} />
        <Check label="Opportunity to sell more" on={d.upsellOpportunity} set={(v) => set("upsellOpportunity", v)} />
      </div>

      {d.upsellOpportunity && (
        <div className="mt-3"><Field label="What could we sell them?"><input className="input" value={d.upsellNote} onChange={(e) => set("upsellNote", e.target.value)} /></Field></div>
      )}
      <div className="mt-3"><Field label="Notes from the conversation"><textarea className="input" rows={3} value={d.notes} onChange={(e) => set("notes", e.target.value)} /></Field></div>

      <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>Logging this month's follow-up makes the client's paid subscriptions eligible for commission.</p>
    </Modal>
  );
}

function Check({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ border: "1px solid var(--line)" }}>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      <span className="text-sm">{label}</span>
    </label>
  );
}
