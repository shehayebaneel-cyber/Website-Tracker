import { useEffect, useState, type ReactNode } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { Page, PageHeader } from "../../components/Page";
import { Card, Spinner, ErrorState, StatusPill, Detail } from "../../components/ui";

const STATUSES = ["Application Received", "Under Review", "Contact Scheduled", "Requirements Confirmed", "Proposal Sent", "Waiting for Approval", "Approved", "Website in Progress", "Ready for Review", "Launched", "Not Proceeding"];

export default function ApplicationDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [a, setA] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true); setError(null);
    api.get<{ application: any }>(`/applications/${id}`).then((r) => setA(r.application)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  async function setStatus(status: string) {
    try { const r = await api.patch<{ application: any }>(`/applications/${id}`, { status }); setA(r.application); } catch (e: any) { alert(e.message); }
  }

  if (loading && !a) return <Page><div className="py-16 text-center"><span className="inline-block"><Spinner /></span></div></Page>;
  if (error) return <Page><ErrorState message={error} onRetry={load} /></Page>;
  if (!a) return null;

  const needs = a.needs ? Object.keys(a.needs).filter((k) => a.needs[k]) : [];
  const has = a.hasContent ? Object.keys(a.hasContent).filter((k) => a.hasContent[k]) : [];

  return (
    <Page>
      <PageHeader
        back={<Link to="/sales/applications" className="mb-1 inline-block text-xs font-medium" style={{ color: "var(--accent)" }}>← Applications</Link>}
        title={<span className="flex items-center gap-2.5">{a.businessName} <StatusPill status={a.status} /></span>}
        subtitle={<span className="tnum">{a.code} · received {fmtDate(a.createdAt)}{a.salespersonName ? ` · ${a.salespersonName}` : ""}</span>}
        actions={
          <div className="flex items-center gap-2">
            <select className="input" style={{ width: "auto" }} value={a.status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            {a.leadCode && <button className="btn" onClick={() => nav(`/sales/leads/${a.leadId}`)}>Open lead {a.leadCode}</button>}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionTitle>Business</SectionTitle>
          <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
            <Detail label="Contact">{a.contactPerson}</Detail>
            <Detail label="Phone">{a.phone}</Detail>
            <Detail label="WhatsApp">{a.whatsapp}</Detail>
            <Detail label="Email">{a.email}</Detail>
            <Detail label="City">{a.city}</Detail>
            <Detail label="Instagram">{a.instagram}</Detail>
            <Detail label="Category">{a.category}</Detail>
            <Detail label="Operating">{a.isOperating ? "Yes" : "Opening soon"}</Detail>
            <Detail label="Existing site">{a.existingWebsite}</Detail>
          </div>
          {a.description && <p className="mt-3 whitespace-pre-wrap text-sm" style={{ color: "var(--ink-2)" }}>{a.description}</p>}

          <div className="my-4" style={{ height: 1, background: "var(--line)" }} />
          <SectionTitle>What they need</SectionTitle>
          <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
            <Detail label="Plan">{a.plan ? a.plan[0].toUpperCase() + a.plan.slice(1) : "—"}</Detail>
            <Detail label="Type">{a.needType === "redesign" ? "Redesign" : "New website"}</Detail>
            <Detail label="Launch">{a.launchTimeline}</Detail>
          </div>
          {needs.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{needs.map((n) => <span key={n} className="pill pill-info">{n}</span>)}</div>}
          {a.otherFeatures && <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>Other: {a.otherFeatures}</p>}
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <SectionTitle>Contact preferences</SectionTitle>
            <Detail label="Method">{a.contactMethod}</Detail>
            <Detail label="Best time">{a.bestTime}</Detail>
            <Detail label="Meeting">{a.meetingType}</Detail>
            <Detail label="Heard via">{a.hearAbout}</Detail>
            <Detail label="Referral code">{a.referralCode}</Detail>
          </Card>

          <Card className="p-4">
            <SectionTitle>Content & files</SectionTitle>
            {has.length > 0 ? <div className="mb-2 flex flex-wrap gap-1.5">{has.map((h) => <span key={h} className="pill pill-neut">{h}</span>)}</div> : <p className="text-sm" style={{ color: "var(--muted)" }}>Nothing marked as ready.</p>}
            {(a.files ?? []).length > 0 ? (
              <div className="mt-2 flex flex-col gap-1.5">
                {a.files.map((f: any, i: number) => (
                  <a key={i} href={f.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
                    <span className="truncate">{f.name}</span><span>↓</span>
                  </a>
                ))}
              </div>
            ) : <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>No files uploaded.</p>}
          </Card>

          {a.additionalInfo && <Card className="p-4"><SectionTitle>Notes</SectionTitle><p className="whitespace-pre-wrap text-sm" style={{ color: "var(--ink-2)" }}>{a.additionalInfo}</p></Card>}
        </div>
      </div>
    </Page>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="mb-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>{children}</div>;
}
