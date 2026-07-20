import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { api } from "../lib/api";
import type { DashboardData } from "../lib/types";
import { money, num, pct, fmtDate, monthLabel, daysLabel } from "../lib/format";
import { Page, PageHeader } from "../components/Page";
import { Card, Spinner, ErrorState, EmptyState, StatusPill } from "../components/ui";

const TONE_COLORS: Record<string, string> = {
  good: "#22c55e", warn: "#eab308", attn: "#f97316", crit: "#ef4444", neut: "#94a3b8", info: "#6366f1",
};
const PIE_PALETTE = ["#6366f1", "#22c55e", "#f97316", "#eab308", "#ef4444", "#14b8a6", "#a855f7", "#94a3b8"];

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonthKey());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  function load() {
    setLoading(true);
    setError(null);
    api
      .get<DashboardData>(`/dashboard?month=${month}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, [month]);

  return (
    <Page>
      <PageHeader
        title="Dashboard"
        subtitle="Business overview — clients, income, renewals and support at a glance"
        actions={
          <label className="flex items-center gap-2">
            <span className="label">Month</span>
            <input
              type="month"
              className="input"
              style={{ width: "auto" }}
              value={month}
              onChange={(e) => setMonth(e.target.value || currentMonthKey())}
            />
          </label>
        }
      />

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && loading && !data && (
        <div className="py-20 text-center"><div className="inline-block"><Spinner label="Loading dashboard…" /></div></div>
      )}

      {data && (
        <div className="flex flex-col gap-5" style={{ opacity: loading ? 0.6 : 1 }}>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            <Stat label="Active clients" value={num(data.cards.activeClients)} onClick={() => nav("/clients?status=Active")} />
            <Stat label="Monthly recurring revenue" value={money(data.cards.monthlyRecurringRevenue)} accent />
            <Stat label="Subscription billed" value={money(data.cards.subscriptionBilled)} />
            <Stat label="Subscription paid" value={money(data.cards.subscriptionPaid)} tone="good" />
            <Stat label="Subscription outstanding" value={money(data.cards.subscriptionOutstanding)} tone={data.cards.subscriptionOutstanding > 0 ? "attn" : "good"} />
            <Stat label="Collection rate" value={pct(data.cards.collectionRate)} tone={collectionTone(data.cards.collectionRate)} />
            <Stat label="Cash received" value={money(data.cards.cashReceived)} tone="good" />
            <Stat label="Expenses" value={money(data.cards.expenses)} tone="attn" />
            <Stat label="Net cash flow" value={money(data.cards.netCashFlow)} tone={data.cards.netCashFlow >= 0 ? "good" : "crit"} />
            <Stat label="Total overdue" value={money(data.cards.totalOverdue)} tone={data.cards.totalOverdue > 0 ? "crit" : "good"} />
            <Stat label="Open support tickets" value={num(data.cards.openTickets)} tone={data.cards.openTickets > 0 ? "warn" : "good"} onClick={() => nav("/support")} />
            <Stat label="Renewals due ≤ 60 days" value={num(data.cards.renewalsDue60)} tone={data.cards.renewalsDue60 > 0 ? "warn" : "good"} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Subscription billed vs paid" subtitle="Last 12 months">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
                  <Tooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="subscriptionBilled" name="Billed" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="subscriptionPaid" name="Paid" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Cash received vs expenses" subtitle="Last 12 months">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
                  <Tooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="cashReceived" name="Cash in" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f97316" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Net cash flow" subtitle="Last 12 months">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
                  <Tooltip content={<ChartTip />} />
                  <Line type="monotone" dataKey="netCashFlow" name="Net" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 2.5 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="grid grid-cols-2 gap-4">
              <PieCard title="Payment status" data={data.breakdowns.paymentStatusBreakdown} />
              <PieCard title="Websites by status" data={data.breakdowns.websitesByStatus} />
              <PieCard title="Clients by plan" data={data.breakdowns.clientsByPlan} />
              <PieCard title="Ticket status" data={data.breakdowns.ticketStatusBreakdown} />
            </div>
          </div>

          {/* Alert lists */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <ListCard title="Overdue invoices" count={data.lists.overdueInvoices.length}>
              {data.lists.overdueInvoices.map((i) => (
                <Row key={i.id} onClick={() => nav(`/clients/${i.clientId}`)}
                  main={i.clientName} sub={`${i.code} · ${i.daysLate}d late`}
                  right={<span className="tnum font-semibold" style={{ color: "var(--crit)" }}>{money(i.balance)}</span>} />
              ))}
              {data.lists.overdueInvoices.length === 0 && <EmptyState icon="✓" title="Nothing overdue" />}
            </ListCard>

            <ListCard title="Unpaid this month" count={data.lists.unpaidSubscriptions.length}>
              {data.lists.unpaidSubscriptions.map((i) => (
                <Row key={i.id} onClick={() => nav(`/clients/${i.clientId}`)}
                  main={i.clientName} sub={<StatusPill status={i.status} />}
                  right={<span className="tnum font-semibold">{money(i.balance)}</span>} />
              ))}
              {data.lists.unpaidSubscriptions.length === 0 && <EmptyState icon="✓" title="All subscriptions paid" />}
            </ListCard>

            <ListCard title="Recent payments" count={data.lists.recentPayments.length}>
              {data.lists.recentPayments.map((p) => (
                <Row key={p.id} onClick={() => nav(`/clients/${p.clientId}`)}
                  main={p.clientName} sub={`${fmtDate(p.paymentDate)} · ${p.method}`}
                  right={<span className="tnum font-semibold" style={{ color: "var(--good)" }}>{money(p.amount)}</span>} />
              ))}
              {data.lists.recentPayments.length === 0 && <EmptyState icon="○" title="No payments yet" />}
            </ListCard>

            <ListCard title="Domains expiring" count={data.lists.domainsExpiring.length}>
              {data.lists.domainsExpiring.map((w) => (
                <Row key={w.id} onClick={() => nav(`/websites/${w.id}`)}
                  main={w.clientName} sub={w.projectName || w.code}
                  right={<StatusPill status={w.status} />} extra={daysLabel(w.daysRemaining)} />
              ))}
              {data.lists.domainsExpiring.length === 0 && <EmptyState icon="✓" title="No domains due" />}
            </ListCard>

            <ListCard title="SSL expiring" count={data.lists.sslExpiring.length}>
              {data.lists.sslExpiring.map((w) => (
                <Row key={w.id} onClick={() => nav(`/websites/${w.id}`)}
                  main={w.clientName} sub={w.projectName || w.code}
                  right={<StatusPill status={w.status} />} extra={daysLabel(w.daysRemaining)} />
              ))}
              {data.lists.sslExpiring.length === 0 && <EmptyState icon="✓" title="No SSL due" />}
            </ListCard>

            <ListCard title="Hosting expiring" count={data.lists.hostingExpiring.length}>
              {data.lists.hostingExpiring.map((w) => (
                <Row key={w.id} onClick={() => nav(`/websites/${w.id}`)}
                  main={w.clientName} sub={w.projectName || w.code}
                  right={<StatusPill status={w.status} />} extra={daysLabel(w.daysRemaining)} />
              ))}
              {data.lists.hostingExpiring.length === 0 && <EmptyState icon="✓" title="No hosting due" />}
            </ListCard>

            <ListCard title="Urgent support tickets" count={data.lists.urgentTickets.length}>
              {data.lists.urgentTickets.map((t) => (
                <Row key={t.id} onClick={() => nav(`/clients/${t.clientId}`)}
                  main={t.clientName} sub={t.summary}
                  right={<StatusPill status={t.deadlineStatus} />} />
              ))}
              {data.lists.urgentTickets.length === 0 && <EmptyState icon="✓" title="No urgent tickets" />}
            </ListCard>

            <ListCard title="Recurring expenses due" count={data.lists.recurringExpensesSoon.length}>
              {data.lists.recurringExpensesSoon.map((e) => (
                <Row key={e.id} onClick={() => nav("/expenses")}
                  main={e.vendor || e.code} sub={daysLabel(e.daysRemaining)}
                  right={<span className="tnum font-semibold">{money(e.amount)}</span>} />
              ))}
              {data.lists.recurringExpensesSoon.length === 0 && <EmptyState icon="✓" title="Nothing due" />}
            </ListCard>

            <ListCard title="Payments not deposited" count={data.cards.undepositedPayments}>
              <div className="px-1 py-3 text-sm" style={{ color: "var(--muted)" }}>
                {data.cards.undepositedPayments === 0
                  ? "All received payments are deposited."
                  : `${data.cards.undepositedPayments} payment(s) received but not yet marked deposited.`}
              </div>
            </ListCard>
          </div>
        </div>
      )}
    </Page>
  );
}

// ---- small components ------------------------------------------------------
function collectionTone(rate: number | null): Tone | undefined {
  if (rate == null) return undefined;
  if (rate >= 90) return "good";
  if (rate >= 60) return "warn";
  return "crit";
}
type Tone = "good" | "warn" | "attn" | "crit";

function Stat({ label, value, tone, accent, onClick }: { label: string; value: string; tone?: Tone; accent?: boolean; onClick?: () => void }) {
  const color = tone ? TONE_COLORS[tone] : accent ? "var(--accent)" : "var(--ink)";
  return (
    <Card className={`p-3.5 ${onClick ? "cursor-pointer transition-shadow hover:shadow-[var(--shadow)]" : ""}`}>
      <div onClick={onClick}>
        <div className="label mb-1.5 leading-tight">{label}</div>
        <div className="tnum text-[1.35rem] font-bold leading-none" style={{ color }}>{value}</div>
      </div>
    </Card>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{title}</div>
        {subtitle && <div className="text-xs" style={{ color: "var(--muted)" }}>{subtitle}</div>}
      </div>
      {children}
    </Card>
  );
}

function PieCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card className="p-3">
      <div className="mb-1 text-xs font-semibold" style={{ color: "var(--ink)" }}>{title}</div>
      {total === 0 ? (
        <div className="py-6 text-center text-xs" style={{ color: "var(--muted)" }}>No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={26} outerRadius={48} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
            </Pie>
            <Tooltip content={<PieTip />} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

function ListCard({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <Card className="flex flex-col p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{title}</div>
        <span className="pill pill-neut">{count}</span>
      </div>
      <div className="flex flex-col">{children}</div>
    </Card>
  );
}

function Row({ main, sub, right, extra, onClick }: { main: ReactNode; sub?: ReactNode; right?: ReactNode; extra?: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 border-b py-2 last:border-0 ${onClick ? "cursor-pointer" : ""}`}
      style={{ borderColor: "var(--line-2)" }}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{main}</div>
        {sub && <div className="truncate text-xs" style={{ color: "var(--muted)" }}>{sub}</div>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {right}
        {extra && <span className="text-[11px]" style={{ color: "var(--muted)" }}>{extra}</span>}
      </div>
    </div>
  );
}

function PieTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="card p-2 text-xs" style={{ boxShadow: "var(--shadow)" }}>
      <span style={{ color: "var(--muted)" }}>{p.name}: </span>
      <span className="font-semibold">{num(p.value)}</span>
    </div>
  );
}

const axisTick = { fontSize: 11, fill: "var(--muted)" };

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-2 text-xs" style={{ boxShadow: "var(--shadow)" }}>
      {label && <div className="mb-1 font-semibold">{monthLabel(String(label))}</div>}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span style={{ color: "var(--muted)" }}>{p.name}:</span>
          <span className="tnum font-semibold">{money(p.value)}</span>
        </div>
      ))}
    </div>
  );
}
