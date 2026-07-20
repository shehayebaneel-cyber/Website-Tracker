import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { canAccess } from "../../lib/perms";
import type { Lead, LeadActivity } from "../../lib/salesTypes";
import { money, fmtDate } from "../../lib/format";
import { Page, PageHeader } from "../../components/Page";
import { Card, Spinner, ErrorState, StatusPill, Detail } from "../../components/ui";
import LeadForm from "./LeadForm";
import ConvertModal from "./ConvertModal";

export default function LeadDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const isAdmin = canAccess(user?.role, "salesTeam");
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [converting, setConverting] = useState(false);

  function load() {
    setLoading(true); setError(null);
    api.get<{ lead: Lead; activities: LeadActivity[] }>(`/leads/${id}`).then((r) => { setLead(r.lead); setActivities(r.activities); }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  async function addNote() {
    if (!note.trim()) return;
    await api.post(`/leads/${id}/activity`, { summary: note.trim() });
    setNote(""); load();
  }

  if (loading && !lead) return <Page><div className="py-16 text-center"><span className="inline-block"><Spinner /></span></div></Page>;
  if (error) return <Page><ErrorState message={error} onRetry={load} /></Page>;
  if (!lead) return null;

  return (
    <Page>
      <PageHeader
        back={<Link to="/sales/leads" className="mb-1 inline-block text-xs font-medium" style={{ color: "var(--accent)" }}>← All leads</Link>}
        title={<span className="flex items-center gap-2.5">{lead.businessName} <StatusPill status={lead.status} /></span>}
        subtitle={<span className="tnum">{lead.code}{lead.salespersonName ? ` · ${lead.salespersonName}` : ""}</span>}
        actions={<>
          {lead.whatsapp && <a className="btn" href={`https://wa.me/${lead.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a>}
          {lead.phone && <a className="btn" href={`tel:${lead.phone}`}>Call</a>}
          <button className="btn" onClick={() => setEditing(true)}>Edit</button>
          {isAdmin && !lead.convertedClientId && <button className="btn btn-primary" onClick={() => setConverting(true)}>Convert to Client</button>}
        </>}
      />

      {lead.convertedClientId && (
        <Card className="mb-4 p-3">
          <span className="pill pill-good mr-2">Won</span>
          <button className="text-sm font-medium" style={{ color: "var(--accent)" }} onClick={() => nav(`/clients/${lead.convertedClientId}`)}>Open client record →</button>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>Lead details</div>
          <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
            <Detail label="Contact">{lead.contactPerson}</Detail>
            <Detail label="Phone">{lead.phone}</Detail>
            <Detail label="WhatsApp">{lead.whatsapp}</Detail>
            <Detail label="Instagram">{lead.instagram}</Detail>
            <Detail label="City">{lead.city}</Detail>
            <Detail label="Category">{lead.category}</Detail>
            <Detail label="Source">{lead.source}</Detail>
            <Detail label="Interested in">{lead.interestedService}</Detail>
            <Detail label="Close chance">{lead.closeChance != null ? `${lead.closeChance}%` : "—"}</Detail>
            <Detail label="Proposed monthly">{lead.proposedMonthly != null ? money(lead.proposedMonthly) : "—"}</Detail>
            <Detail label="Proposed setup">{lead.proposedSetup != null ? money(lead.proposedSetup) : "—"}</Detail>
            <Detail label="Next follow-up">{fmtDate(lead.nextFollowUpDate)}</Detail>
          </div>
          {lead.notes && <p className="mt-3 whitespace-pre-wrap text-sm" style={{ color: "var(--ink-2)" }}>{lead.notes}</p>}
        </Card>

        <Card className="p-4">
          <div className="mb-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>Activity</div>
          <div className="mb-3 flex gap-1.5">
            <input className="input" style={{ height: 34 }} placeholder="Add a contact note…" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} />
            <button className="btn btn-sm" onClick={addNote}>Add</button>
          </div>
          <div className="flex flex-col">
            {activities.map((a) => (
              <div key={a.id} className="border-b py-2 last:border-0" style={{ borderColor: "var(--line-2)" }}>
                <div className="text-sm" style={{ color: "var(--ink)" }}>{a.summary}</div>
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>{a.user ?? "—"} · {fmtDate(a.createdAt)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {editing && <LeadForm open={editing} isAdmin={isAdmin} existing={lead} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
      {converting && <ConvertModal open lead={lead} onClose={() => setConverting(false)} onConverted={(clientId) => { setConverting(false); nav(`/clients/${clientId}`); }} />}
    </Page>
  );
}
