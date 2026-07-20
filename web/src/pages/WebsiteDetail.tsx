import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Website } from "../lib/types";
import { money, fmtDate, daysLabel } from "../lib/format";
import { Page, PageHeader } from "../components/Page";
import { Card, Spinner, ErrorState, StatusPill, Detail } from "../components/ui";
import WebsiteForm from "./WebsiteForm";

export default function WebsiteDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [w, setW] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    api.get<{ website: Website }>(`/websites/${id}`).then((r) => setW(r.website)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  if (loading && !w) return <Page><div className="py-20 text-center"><span className="inline-block"><Spinner /></span></div></Page>;
  if (error) return <Page><ErrorState message={error} onRetry={load} /></Page>;
  if (!w) return null;

  return (
    <Page>
      <PageHeader
        back={<Link to="/websites" className="mb-1 inline-block text-xs font-medium" style={{ color: "var(--accent)" }}>← All websites</Link>}
        title={<span className="flex items-center gap-2.5">{w.projectName || w.code} <StatusPill status={w.status} /></span>}
        subtitle={<span className="tnum">{w.code} · <Link to={`/clients/${w.clientId}`} style={{ color: "var(--accent)" }}>{w.clientName}</Link></span>}
        actions={<button className="btn" onClick={() => setEditing(true)}>Edit</button>}
      />

      {/* Link buttons */}
      <div className="mb-5 flex flex-wrap gap-2">
        <LinkBtn href={w.primaryUrl} label="Open Website" />
        <LinkBtn href={w.adminUrl} label="Open Admin" />
        <LinkBtn href={w.repositoryUrl} label="Open Repository" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RenewalCard title="Domain" status={w.domainStatus} days={w.domainDaysRemaining} renewalDate={w.domainRenewalDate}
          rows={[["Domain", w.domainName], ["Provider", w.domainProvider], ["Owner", w.domainOwner], ["Cost", w.domainCost != null ? money(w.domainCost) : null], ["Auto-renew", w.domainAutoRenew ? "On" : "Off"]]} />
        <RenewalCard title="Hosting" status={w.hostingStatus} days={w.hostingDaysRemaining} renewalDate={w.hostingRenewalDate}
          rows={[["Provider", w.hostingProvider], ["Plan", w.hostingPlan], ["Owner", w.hostingOwner], ["Cost", w.hostingCost != null ? money(w.hostingCost) : null], ["Auto-renew", w.hostingAutoRenew ? "On" : "Off"]]} />
        <RenewalCard title="SSL certificate" status={w.sslStatus} days={w.sslDaysRemaining} renewalDate={w.sslExpiryDate}
          rows={[["Expiry", fmtDate(w.sslExpiryDate)]]} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>Project</div>
          <div className="grid grid-cols-2 gap-x-6">
            <Detail label="Primary URL">{w.primaryUrl ? <a href={w.primaryUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{w.primaryUrl}</a> : "—"}</Detail>
            <Detail label="Deployment">{w.deploymentPlatform}</Detail>
            <Detail label="Project start">{fmtDate(w.projectStartDate)}</Detail>
            <Detail label="Launched">{fmtDate(w.launchDate)}</Detail>
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>Technical & maintenance</div>
          <div className="grid grid-cols-2 gap-x-6">
            <Detail label="Analytics">{w.analyticsInstalled ? "Installed" : "No"}</Detail>
            <Detail label="Search Console">{w.searchConsoleInstalled ? "Installed" : "No"}</Detail>
            <Detail label="Last backup">{fmtDate(w.lastBackupDate)}</Detail>
            <Detail label="Last update">{fmtDate(w.lastWebsiteUpdate)}</Detail>
            <Detail label="Credentials">{w.credentialLocation || "—"}</Detail>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
            Passwords are never stored here — only a reference to where they live (e.g. your password manager).
          </p>
        </Card>
      </div>

      {editing && <WebsiteForm open={editing} existing={w} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
      <div className="mt-6">
        <button className="btn btn-sm" onClick={() => nav(`/clients/${w.clientId}`)}>← Back to {w.clientName}</button>
      </div>
    </Page>
  );
}

function LinkBtn({ href, label }: { href: string | null; label: string }) {
  if (!href) return <button className="btn btn-sm" disabled>{label}</button>;
  return <a className="btn btn-sm" href={href} target="_blank" rel="noreferrer">{label} ↗</a>;
}

function RenewalCard({ title, status, days, renewalDate, rows }: {
  title: string; status: string; days: number | null; renewalDate: string | null; rows: [string, React.ReactNode][];
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{title}</div>
        <StatusPill status={status} />
      </div>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="tnum text-lg font-bold" style={{ color: "var(--ink)" }}>{fmtDate(renewalDate)}</span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>{daysLabel(days)}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4">
        {rows.filter(([, v]) => v != null && v !== "").map(([k, v]) => <Detail key={k} label={k}>{v}</Detail>)}
      </div>
    </Card>
  );
}
