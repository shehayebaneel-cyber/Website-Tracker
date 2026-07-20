import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { api } from "../../lib/api";
import { money, num, monthLabel, daysLabel } from "../../lib/format";
import { Page, PageHeader } from "../../components/Page";
import { Card, Spinner, ErrorState, EmptyState } from "../../components/ui";

export default function SalesDashboard() {
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true); setError(null);
    api.get<any>("/sales-dashboard").then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  if (error) return <Page><PageHeader title="Sales Dashboard" /><ErrorState message={error} onRetry={load} /></Page>;
  if (loading && !data) return <Page><PageHeader title="Sales Dashboard" /><div className="py-16 text-center"><span className="inline-block"><Spinner /></span></div></Page>;
  if (!data) return null;

  return data.mode === "salesperson" ? <SalespersonView data={data} nav={nav} /> : <AdminView data={data} nav={nav} />;
}

function Stat({ label, value, tone, onClick }: { label: string; value: string; tone?: "good" | "attn" | "crit" | "accent"; onClick?: () => void }) {
  const color = tone === "good" ? "var(--good)" : tone === "attn" ? "var(--attn)" : tone === "crit" ? "var(--crit)" : tone === "accent" ? "var(--accent)" : "var(--ink)";
  return (
    <Card className={`p-3.5 ${onClick ? "cursor-pointer hover:shadow-[var(--shadow)]" : ""}`}>
      <div onClick={onClick}>
        <div className="label mb-1.5 leading-tight">{label}</div>
        <div className="tnum text-[1.35rem] font-bold leading-none" style={{ color }}>{value}</div>
      </div>
    </Card>
  );
}

function AdminView({ data, nav }: { data: any; nav: any }) {
  const c = data.cards;
  return (
    <Page>
      <PageHeader title="Sales Dashboard" subtitle="Team performance, revenue and commission at a glance" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <Stat label="Active salespeople" value={num(c.activeSalespeople)} onClick={() => nav("/sales/team")} />
        <Stat label="Active leads" value={num(c.totalActiveLeads)} onClick={() => nav("/sales/leads")} />
        <Stat label="New leads this month" value={num(c.newLeadsThisMonth)} />
        <Stat label="Deals won this month" value={num(c.dealsWonThisMonth)} tone="good" />
        <Stat label="New clients this month" value={num(c.newClientsThisMonth)} tone="good" />
        <Stat label="Active paying websites" value={num(c.activePayingWebsites)} tone="accent" />
        <Stat label="Monthly subscription revenue" value={money(c.monthlySubscriptionRevenue)} />
        <Stat label="Expected commission" value={money(c.expectedCommissionThisMonth)} tone="attn" />
        <Stat label="Company revenue after commission" value={money(c.companyRevenueAfterCommission)} tone="good" />
        <Stat label="Unpaid clients" value={num(c.unpaidClients)} tone={c.unpaidClients > 0 ? "crit" : "good"} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>New clients by month</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.breakdowns.newClientsByMonth} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={28} />
              <Tooltip labelFormatter={(l) => monthLabel(String(l))} />
              <Bar dataKey="count" name="New clients" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <div className="mb-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>By salesperson</div>
          {data.breakdowns.bySalesperson.length === 0 ? <EmptyState title="No assignments yet" /> : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="border-b" style={{ borderColor: "var(--line)" }}>
                  {["Salesperson", "Clients", "Paying", "Revenue", "Commission"].map((h, i) => <th key={h} className={`px-2 py-1.5 text-xs font-semibold uppercase ${i === 0 ? "text-left" : "text-right"}`} style={{ color: "var(--muted)" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {data.breakdowns.bySalesperson.map((r: any) => (
                    <tr key={r.name} className="border-b" style={{ borderColor: "var(--line-2)" }}>
                      <td className="px-2 py-1.5">{r.name}</td>
                      <td className="px-2 py-1.5 text-right tnum">{r.clients}</td>
                      <td className="px-2 py-1.5 text-right tnum">{r.paying}</td>
                      <td className="px-2 py-1.5 text-right tnum">{money(r.revenue)}</td>
                      <td className="px-2 py-1.5 text-right tnum" style={{ color: "var(--attn)" }}>{money(r.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}

function SalespersonView({ data, nav }: { data: any; nav: any }) {
  const c = data.cards;
  return (
    <Page>
      <PageHeader title="My Sales" subtitle="Your leads, clients and commission" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Active leads" value={num(c.activeLeads)} onClick={() => nav("/sales/leads")} />
        <Stat label="Follow-ups due" value={num(c.followUpsDue)} tone={c.followUpsDue > 0 ? "attn" : "good"} />
        <Stat label="Assigned clients" value={num(c.assignedClients)} onClick={() => nav("/sales/clients")} />
        <Stat label="Clients paid" value={num(c.paidClients)} tone="good" />
        <Stat label="Clients unpaid" value={num(c.unpaidClients)} tone={c.unpaidClients > 0 ? "crit" : "good"} />
        <Stat label="Expected commission" value={money(c.expectedCommission)} tone="accent" />
      </div>

      <Card className="mt-4 p-3">
        <p className="text-xs" style={{ color: "var(--muted)" }}>{data.commissionNote}</p>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>Leads to follow up</div>
          {data.leadsToFollowUp.length === 0 ? <EmptyState icon="✓" title="Nothing due" /> : data.leadsToFollowUp.map((l: any) => (
            <div key={l.id} className="flex items-center gap-2 border-b py-2 last:border-0" style={{ borderColor: "var(--line-2)" }}>
              <button className="min-w-0 flex-1 text-left" onClick={() => nav(`/sales/leads/${l.id}`)}>
                <div className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{l.businessName}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{l.status} · {daysLabel(l.nextFollowUpDate ? Math.round((new Date(l.nextFollowUpDate).getTime() - Date.now()) / 86400000) : null)}</div>
              </button>
              {l.whatsapp && <a className="btn btn-sm" href={`https://wa.me/${l.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">WA</a>}
              {l.phone && <a className="btn btn-sm" href={`tel:${l.phone}`}>Call</a>}
            </div>
          ))}
        </Card>

        <Card className="p-4">
          <div className="mb-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>My clients</div>
          {data.assignedClients.length === 0 ? <EmptyState title="No assigned clients yet" /> : data.assignedClients.map((a: any) => (
            <div key={a.assignmentId} className="flex items-center justify-between border-b py-2 last:border-0" style={{ borderColor: "var(--line-2)" }}>
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>{a.businessName}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{money(a.monthlyFee)}/mo</div>
              </div>
              <span className={`pill ${a.paidThisMonth ? "pill-good" : "pill-warn"}`}>{a.paidThisMonth ? "Paid" : "Unpaid"}</span>
            </div>
          ))}
        </Card>
      </div>
    </Page>
  );
}
