import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { Icon } from "../components/icons";
import { waLink } from "../data/content";

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
function money(n: number) { return `$${(n ?? 0).toFixed(2)}`; }

interface Req { id: string; code: string; summary: string; requestType: string | null; category: string; priority: string; status: string; rawStatus: string; requestedDate: string; completedDate: string | null }
interface WebsiteDto { id: string; code: string; projectName: string | null; primaryUrl: string | null; status: string; monthlyFee: number; billingDay: number; subscriptionActive: boolean; nextPaymentDate: string | null; includedUpdates: number; updatesUsed: number }
interface Me {
  client: { code: string; businessName: string; contactName: string | null; servicePlan: string | null; status: string };
  subscription: { monthlyTotal: number; balance: number; paidThisMonth: boolean; nextPaymentDate: string | null };
  websites: WebsiteDto[];
  invoices: { code: string; billingMonth: string; chargeType: string; amountDue: number; amountPaid: number; balance: number; status: string; dueDate: string }[];
  payments: { code: string; paymentDate: string; amount: number; method: string; invoiceCode: string | null }[];
  rep: { name: string; phone: string | null; whish: string | null } | null;
  openRequests: Req[];
  closedRequests: Req[];
}

export default function Portal() {
  const { user, loading, logout } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    api.get<Me>("/portal/me").then(setMe).catch((e) => setError(e.message)).finally(() => setBusy(false));
  }, [loading, user]);

  if (!loading && !user) return <Navigate to="/login" replace />;
  if (loading || busy) return <section className="section"><div className="container" style={{ maxWidth: 900 }}><p className="lead">Loading your account…</p></div></section>;
  if (error) return <section className="section"><div className="container" style={{ maxWidth: 900 }}><p style={{ color: "#c0392b" }}>{error}</p></div></section>;
  if (!me) return null;

  const sub = me.subscription;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 900 }}>
        {/* Greeting */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="eyebrow mb-1">Your account</div>
            <h1 className="h-section">{me.client.businessName}</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{me.client.code}{me.client.servicePlan ? ` · ${me.client.servicePlan} plan` : ""}</p>
          </div>
          <button className="btn btn-ghost" onClick={logout} style={{ padding: "0.55rem 1rem" }}>Sign out</button>
        </div>

        {/* Subscription summary */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card>
            <Label>Monthly subscription</Label>
            <Big>{money(sub.monthlyTotal)}</Big>
            <Hint>{me.websites.filter((w) => w.subscriptionActive).length} active website{me.websites.filter((w) => w.subscriptionActive).length === 1 ? "" : "s"}</Hint>
          </Card>
          <Card>
            <Label>This month</Label>
            <Big style={{ color: sub.paidThisMonth ? "#1a8f5c" : sub.balance > 0 ? "#c0392b" : "var(--ink)" }}>{sub.paidThisMonth ? "Paid" : sub.balance > 0 ? "Due" : "—"}</Big>
            <Hint>{sub.balance > 0 ? `${money(sub.balance)} outstanding` : "You're all paid up"}</Hint>
          </Card>
          <Card>
            <Label>Next payment</Label>
            <Big style={{ fontSize: "1.35rem" }}>{fmtDate(sub.nextPaymentDate)}</Big>
            <Hint>{me.rep ? `Rep: ${me.rep.name}` : "IGNIS team"}</Hint>
          </Card>
        </div>

        {/* Websites */}
        <H>Your website{me.websites.length === 1 ? "" : "s"}</H>
        <div className="grid grid-cols-1 gap-3">
          {me.websites.map((w) => (
            <div key={w.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>{w.projectName || "Website"}</div>
                  {w.primaryUrl && <a href={w.primaryUrl} target="_blank" rel="noreferrer" className="text-sm" style={{ color: "var(--orange)" }}>{w.primaryUrl.replace(/^https?:\/\//, "")}</a>}
                </div>
                <span className="pill-tag" style={{ background: w.status === "Live" ? "#1a8f5c" : "var(--muted)" }}>{w.status}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Mini label="Subscription" value={`${money(w.monthlyFee)}/mo`} />
                <Mini label="Next payment" value={fmtDate(w.nextPaymentDate)} />
                <Mini label="Updates this month" value={`${w.updatesUsed} of ${w.includedUpdates} used`} />
              </div>
              {w.updatesUsed >= w.includedUpdates && (
                <p className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: "var(--cream)", color: "var(--muted)" }}>You've used your included updates this month. Extra updates may be quoted separately.</p>
              )}
            </div>
          ))}
        </div>

        {/* Requests */}
        <div className="mt-8 flex items-center justify-between">
          <H inline>Support requests</H>
          <Link to="/portal/new" className="btn btn-primary" style={{ padding: "0.6rem 1rem" }}>New request</Link>
        </div>
        {me.openRequests.length === 0 && me.closedRequests.length === 0 ? (
          <div className="card p-5 text-sm" style={{ color: "var(--muted)" }}>No requests yet. Need a change or spotted a problem? <Link to="/portal/new" style={{ color: "var(--orange)", fontWeight: 600 }}>Start a new request.</Link></div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {[...me.openRequests, ...me.closedRequests].map((r) => (
              <Link key={r.id} to={`/portal/request/${r.id}`} className="card flex items-center justify-between gap-3 p-4" style={{ transition: "border-color .15s" }}>
                <div>
                  <div className="text-sm font-semibold">{r.summary}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{r.code} · {r.requestType || r.category} · {fmtDate(r.requestedDate)}</div>
                </div>
                <span className="pill-tag" style={{ background: ["Completed", "Closed"].includes(r.status) ? "#1a8f5c" : "var(--orange)" }}>{r.status}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Billing history */}
        <H>Invoices &amp; payments</H>
        <div className="card overflow-x-auto">
          <table className="w-full border-collapse text-sm" style={{ minWidth: 440 }}>
            <thead><tr style={{ borderBottom: "1px solid var(--line)" }}>
              <th style={thStyle}>Invoice</th><th style={thStyle}>Month</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Amount</th><th style={{ ...thStyle, textAlign: "right" }}>Status</th>
            </tr></thead>
            <tbody>
              {me.invoices.length === 0 && <tr><td colSpan={4} style={{ padding: "1rem", color: "var(--muted)" }}>No invoices yet.</td></tr>}
              {me.invoices.map((i) => (
                <tr key={i.code} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={tdStyle}>{i.code}</td>
                  <td style={tdStyle}>{new Date(i.billingMonth).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{money(i.amountDue)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: i.balance <= 0 ? "#1a8f5c" : "#c0392b" }}>{i.balance <= 0 ? "Paid" : money(i.balance) + " due"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rep contact */}
        {me.rep && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4" style={{ background: "var(--cream)" }}>
            <div className="text-sm" style={{ color: "var(--ink-2)" }}>Your IGNIS representative is <b>{me.rep.name}</b>. Questions? We're one message away.</div>
            <a href={waLink(`Hi IGNIS, this is ${me.client.businessName}.`)} target="_blank" rel="noreferrer" className="btn btn-wa" style={{ padding: "0.6rem 1rem" }}><Icon.whatsapp size={16} /> WhatsApp us</a>
          </div>
        )}
      </div>
    </section>
  );
}

const thStyle: React.CSSProperties = { padding: "0.6rem 0.9rem", textAlign: "left", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" };
const tdStyle: React.CSSProperties = { padding: "0.6rem 0.9rem" };

function Card({ children }: { children: React.ReactNode }) { return <div className="card p-5">{children}</div>; }
function Label({ children }: { children: React.ReactNode }) { return <div className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{children}</div>; }
function Big({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) { return <div className="mt-1 text-2xl font-bold" style={{ fontFamily: "var(--font-display)", ...style }}>{children}</div>; }
function Hint({ children }: { children: React.ReactNode }) { return <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{children}</div>; }
function Mini({ label, value }: { label: string; value: string }) { return <div><div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div><div className="text-sm font-semibold">{value}</div></div>; }
function H({ children, inline }: { children: React.ReactNode; inline?: boolean }) { return <h2 className={inline ? "" : "mt-8 mb-3"} style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 700 }}>{children}</h2>; }
