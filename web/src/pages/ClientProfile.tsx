import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Client, Website, Invoice, Payment, Expense, Ticket } from "../lib/types";
import { money, fmtDate, fmtMonth, daysLabel } from "../lib/format";
import { Page, PageHeader } from "../components/Page";
import { Card, Spinner, ErrorState, EmptyState, StatusPill, Detail, Field } from "../components/ui";
import { Modal } from "../components/Modal";
import ClientForm from "./ClientForm";
import WebsiteForm from "./WebsiteForm";
import InvoiceForm from "./InvoiceForm";
import PaymentForm from "./PaymentForm";
import ExpenseForm from "./ExpenseForm";
import TicketForm from "./TicketForm";
import ReminderModal, { type ReminderTarget } from "../components/ReminderModal";

interface Profile {
  client: Client;
  websites: Website[];
  invoices: Invoice[];
  payments: Payment[];
  tickets: Ticket[];
  expenses: Expense[];
  portalLogin?: { email: string; active: boolean } | null;
}

const TABS = ["Overview", "Websites", "Invoices", "Payments", "Expenses", "Support", "Notes"] as const;
type Tab = (typeof TABS)[number];

export default function ClientProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [editing, setEditing] = useState(false);
  const [addingSite, setAddingSite] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [modal, setModal] = useState<null | "invoice" | "payment" | "expense" | "ticket">(null);
  const [remind, setRemind] = useState<ReminderTarget | null>(null);
  const [portalModal, setPortalModal] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    api.get<Profile>(`/clients/${id}`).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  async function action(path: string) {
    setActionBusy(true);
    try {
      await api.post(`/clients/${id}/${path}`);
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionBusy(false);
    }
  }

  if (loading && !data) return <Page><div className="py-20 text-center"><span className="inline-block"><Spinner /></span></div></Page>;
  if (error) return <Page><ErrorState message={error} onRetry={load} /></Page>;
  if (!data) return null;

  const c = data.client;
  const upcomingRenewals = data.websites.flatMap((w) => [
    { label: "Domain", w, status: w.domainStatus, days: w.domainDaysRemaining },
    { label: "Hosting", w, status: w.hostingStatus, days: w.hostingDaysRemaining },
    { label: "SSL", w, status: w.sslStatus, days: w.sslDaysRemaining },
  ]).filter((r) => r.days != null && r.days <= 60);

  return (
    <Page>
      <PageHeader
        back={<Link to="/clients" className="mb-1 inline-block text-xs font-medium" style={{ color: "var(--accent)" }}>← All clients</Link>}
        title={<span className="flex items-center gap-2.5">{c.businessName} <StatusPill status={c.status} /></span>}
        subtitle={<span className="tnum">{c.code}{c.city ? ` · ${c.city}` : ""}{c.phone ? ` · ${c.phone}` : ""}</span>}
        actions={
          <>
            <button className="btn" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn" onClick={() => setAddingSite(true)}>+ Website</button>
            <button className="btn" onClick={() => setModal("invoice")}>+ Invoice</button>
            <button className="btn" onClick={() => setModal("payment")}>+ Payment</button>
            <button className="btn" onClick={() => setModal("expense")}>+ Expense</button>
            <button className="btn" onClick={() => setModal("ticket")}>+ Ticket</button>
            <button className="btn" onClick={() => setPortalModal(true)}>{data.portalLogin ? "Portal ✓" : "Portal login"}</button>
            {c.status !== "Cancelled" && c.status !== "Paused" && (
              <button className="btn" disabled={actionBusy} onClick={() => action("pause")}>Pause</button>
            )}
            {(c.status === "Paused" || c.status === "Cancelled") && (
              <button className="btn" disabled={actionBusy} onClick={() => action("reactivate")}>Reactivate</button>
            )}
            {c.status !== "Cancelled" && (
              <button className="btn" disabled={actionBusy} onClick={() => confirm("Cancel this client's subscription?") && action("cancel")}>Cancel</button>
            )}
          </>
        }
      />

      {/* KPI strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Mini label="Monthly fee" value={money(c.monthlyFee)} />
        <Mini label="Current balance" value={money(c.outstanding ?? 0)} tone={(c.outstanding ?? 0) > 0 ? "crit" : "good"} />
        <Mini label="Total paid" value={money(c.totalPaid ?? 0)} />
        <Mini label="Paid through" value={c.paidThrough ? fmtMonth(c.paidThrough) : "—"} />
        <Mini label="Next due" value={c.nextDueDate ? fmtDate(c.nextDueDate) : "—"} sub={c.nextDueInDays != null ? daysLabel(c.nextDueInDays) : undefined} />
        <Mini label="Websites" value={String(c.websiteCount ?? 0)} sub={`${c.openTicketCount ?? 0} open ticket(s)`} />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b" style={{ borderColor: "var(--line)" }}>
        {TABS.map((t) => {
          const badge = t === "Websites" ? data.websites.length : t === "Invoices" ? data.invoices.length : t === "Payments" ? data.payments.length : t === "Expenses" ? data.expenses.length : t === "Support" ? data.tickets.length : null;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors"
              style={{ color: tab === t ? "var(--accent)" : "var(--muted)" }}
            >
              {t}{badge != null && badge > 0 ? ` (${badge})` : ""}
              {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded" style={{ background: "var(--accent)" }} />}
            </button>
          );
        })}
      </div>

      {tab === "Overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-4 lg:col-span-2">
            <SectionTitle>Client details</SectionTitle>
            <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
              <Detail label="Contact">{c.contactName}</Detail>
              <Detail label="Phone">{c.phone}</Detail>
              <Detail label="City">{c.city}</Detail>
              <Detail label="Service plan">{c.servicePlan}</Detail>
              <Detail label="Billing day">{c.billingDay ?? "—"}</Detail>
              <Detail label="Payment method">{c.paymentMethod}</Detail>
              <Detail label="Started">{fmtDate(c.subscriptionStartDate)}</Detail>
              <Detail label="Last payment">{fmtDate(c.lastPaymentDate)}</Detail>
              <Detail label="Website">
                {c.website ? <a href={c.website} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>Open ↗</a> : "—"}
              </Detail>
            </div>
          </Card>
          <Card className="p-4">
            <SectionTitle>Upcoming renewals</SectionTitle>
            {upcomingRenewals.length === 0 ? (
              <EmptyState icon="✓" title="Nothing due in 60 days" />
            ) : (
              upcomingRenewals.map((r, i) => (
                <div key={i} className="flex items-center justify-between border-b py-2 last:border-0" style={{ borderColor: "var(--line-2)" }}>
                  <div>
                    <div className="text-sm font-medium">{r.label}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{r.w.projectName || r.w.code} · {daysLabel(r.days)}</div>
                  </div>
                  <StatusPill status={r.status} />
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {tab === "Websites" && (
        <MiniTable
          empty="No websites yet"
          rows={data.websites}
          onRow={(w) => nav(`/websites/${w.id}`)}
          cols={[
            { h: "ID", c: (w) => <span className="tnum font-semibold">{w.code}</span> },
            { h: "Project", c: (w) => w.projectName || "—" },
            { h: "Status", c: (w) => <StatusPill status={w.status} /> },
            { h: "Domain", c: (w) => <StatusPill status={w.domainStatus} /> },
            { h: "Hosting", c: (w) => <StatusPill status={w.hostingStatus} /> },
            { h: "SSL", c: (w) => <StatusPill status={w.sslStatus} /> },
          ]}
        />
      )}

      {tab === "Invoices" && (
        <MiniTable
          empty="No invoices yet"
          rows={data.invoices}
          cols={[
            { h: "Invoice", c: (i) => <span className="tnum font-semibold">{i.code}</span> },
            { h: "Month", c: (i) => fmtMonth(i.billingMonth) },
            { h: "Type", c: (i) => i.chargeType },
            { h: "Due", c: (i) => <span className="tnum">{money(i.amountDue)}</span>, align: "right" },
            { h: "Paid", c: (i) => <span className="tnum">{money(i.amountPaid)}</span>, align: "right" },
            { h: "Balance", c: (i) => <span className="tnum font-semibold">{money(i.balance)}</span>, align: "right" },
            { h: "Status", c: (i) => <StatusPill status={i.status} /> },
            { h: "Reminder", c: (i) => i.balance > 0
              ? <button className="btn btn-sm" onClick={() => setRemind({ invoiceId: i.id, clientName: c.businessName, contactName: c.contactName, phone: c.phone, invoiceCode: i.code, balance: i.balance, daysLate: i.daysLate, dueDate: i.dueDate, reminderStatus: i.reminderStatus })}>Remind{i.reminderStatus !== "Not Sent" ? " ✓" : ""}</button>
              : <span style={{ color: "var(--muted)" }}>—</span> },
          ]}
        />
      )}

      {tab === "Payments" && (
        <MiniTable
          empty="No payments yet"
          rows={data.payments}
          cols={[
            { h: "Payment", c: (p) => <span className="tnum font-semibold">{p.code}</span> },
            { h: "Date", c: (p) => fmtDate(p.paymentDate) },
            { h: "Invoice", c: (p) => p.invoiceCode ?? "—" },
            { h: "Method", c: (p) => p.method },
            { h: "Deposit", c: (p) => <StatusPill status={p.depositStatus} /> },
            { h: "Amount", c: (p) => <span className="tnum font-semibold" style={{ color: "var(--good)" }}>{money(p.amount)}</span>, align: "right" },
          ]}
        />
      )}

      {tab === "Expenses" && (
        <MiniTable
          empty="No expenses linked to this client"
          rows={data.expenses}
          cols={[
            { h: "Expense", c: (e) => <span className="tnum font-semibold">{e.code}</span> },
            { h: "Date", c: (e) => fmtDate(e.expenseDate) },
            { h: "Category", c: (e) => e.category },
            { h: "Vendor", c: (e) => e.vendor ?? "—" },
            { h: "Recurring", c: (e) => (e.recurring ? e.renewalFrequency : "One time") },
            { h: "Amount", c: (e) => <span className="tnum font-semibold">{money(e.amount)}</span>, align: "right" },
          ]}
        />
      )}

      {tab === "Support" && (
        <MiniTable
          empty="No support tickets"
          rows={data.tickets}
          cols={[
            { h: "Ticket", c: (t) => <span className="tnum font-semibold">{t.code}</span> },
            { h: "Summary", c: (t) => <span>{t.summary}{t.unbilledExtraWork && <span className="pill pill-attn ml-2">Unbilled</span>}</span> },
            { h: "Priority", c: (t) => <StatusPill status={t.priority} /> },
            { h: "Status", c: (t) => <StatusPill status={t.status} /> },
            { h: "Deadline", c: (t) => <StatusPill status={t.deadlineStatus} /> },
            { h: "Hours", c: (t) => <span className="tnum">{t.hoursSpent}</span>, align: "right" },
          ]}
        />
      )}

      {tab === "Notes" && (
        <Card className="p-4">
          <SectionTitle>Notes</SectionTitle>
          <p className="whitespace-pre-wrap text-sm" style={{ color: c.notes ? "var(--ink)" : "var(--muted)" }}>
            {c.notes || "No notes recorded."}
          </p>
        </Card>
      )}

      {editing && <ClientForm open={editing} existing={c} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
      {addingSite && <WebsiteForm open={addingSite} clientId={c.id} onClose={() => setAddingSite(false)} onSaved={() => { setAddingSite(false); load(); }} />}
      {modal === "invoice" && <InvoiceForm open clientId={c.id} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal === "payment" && <PaymentForm open clientId={c.id} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal === "expense" && <ExpenseForm open clientId={c.id} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal === "ticket" && <TicketForm open clientId={c.id} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {remind && <ReminderModal open target={remind} onClose={() => setRemind(null)} onStatusChanged={load} />}
      {portalModal && <PortalLoginModal clientId={c.id} existing={data.portalLogin ?? null} defaultEmail="" onClose={() => setPortalModal(false)} onSaved={() => { setPortalModal(false); load(); }} />}
    </Page>
  );
}

function PortalLoginModal({ clientId, existing, defaultEmail, onClose, onSaved }: { clientId: string; existing: { email: string; active: boolean } | null; defaultEmail: string; onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState(existing?.email ?? defaultEmail);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function save() {
    setBusy(true); setError(null);
    try { await api.post(`/clients/${clientId}/portal-login`, { email, password }); setDone(true); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal open onClose={onClose} title={existing ? "Client portal login" : "Create portal login"}
      footer={done
        ? <button className="btn btn-primary" onClick={onSaved}>Done</button>
        : <>
            <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={busy || !email || password.length < 6}>{busy ? "Saving…" : existing ? "Update login" : "Create login"}</button>
          </>}>
      {error && <div className="pill pill-crit mb-3 w-full justify-center py-2">{error}</div>}
      {done ? (
        <p className="text-sm">Login is ready. Share these with the client to sign in at the IGNIS site → <b>Client Login</b>:</p>
      ) : (
        <p className="mb-3 text-sm" style={{ color: "var(--muted)" }}>
          {existing ? `Current login: ${existing.email}. Set a new email and/or password below.` : "Give this client access to their portal (websites, payments, support requests)."}
        </p>
      )}
      <Field label="Email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={done} /></Field>
      <div className="mt-3"><Field label={existing ? "New password" : "Password (min 6 chars)"}><input className="input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} disabled={done} placeholder="give the client this password" /></Field></div>
      {done && <div className="mt-3 rounded-lg p-3 text-sm tnum" style={{ background: "var(--surface-2)" }}>{email}{password ? ` · ${password}` : ""}</div>}
    </Modal>
  );
}

function Mini({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "crit" }) {
  const color = tone === "crit" ? "var(--crit)" : tone === "good" ? "var(--good)" : "var(--ink)";
  return (
    <Card className="p-3">
      <div className="label mb-1 leading-tight">{label}</div>
      <div className="tnum text-lg font-bold leading-none" style={{ color }}>{value}</div>
      {sub && <div className="mt-1 text-[11px]" style={{ color: "var(--muted)" }}>{sub}</div>}
    </Card>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="mb-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>{children}</div>;
}

interface MiniCol<T> { h: string; c: (row: T) => ReactNode; align?: "right" }
function MiniTable<T extends { id: string }>({ rows, cols, empty, onRow }: { rows: T[]; cols: MiniCol<T>[]; empty: string; onRow?: (r: T) => void }) {
  if (rows.length === 0) return <Card className="p-2"><EmptyState title={empty} /></Card>;
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b" style={{ background: "var(--surface-2)" }}>
            {cols.map((col) => (
              <th key={col.h} className={`px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide ${col.align === "right" ? "text-right" : "text-left"}`} style={{ color: "var(--muted)" }}>{col.h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onRow?.(r)} className={`border-b ${onRow ? "cursor-pointer" : ""}`} style={{ borderColor: "var(--line-2)" }}>
              {cols.map((col) => (
                <td key={col.h} className={`px-3.5 py-2.5 ${col.align === "right" ? "text-right tnum" : "text-left"}`}>{col.c(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
