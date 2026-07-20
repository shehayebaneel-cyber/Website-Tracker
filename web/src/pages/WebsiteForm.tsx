import { useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { useOptions } from "../lib/useOptions";
import type { Website } from "../lib/types";
import { Modal } from "../components/Modal";
import { Field } from "../components/ui";

function dateInput(v: string | null | undefined): string {
  return v ? new Date(v).toISOString().slice(0, 10) : "";
}

export default function WebsiteForm({
  open,
  onClose,
  onSaved,
  clientId,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (w: Website) => void;
  clientId?: string;
  existing?: Website | null;
}) {
  const options = useOptions();
  const [d, setD] = useState<Partial<Website>>(existing ?? { status: "Planning", domainAutoRenew: false, hostingAutoRenew: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Website>(k: K, v: Website[K]) => setD((p) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body: any = { ...d, clientId: existing?.clientId ?? clientId };
      // normalize empty strings to null
      for (const k of Object.keys(body)) if (body[k] === "") body[k] = null;
      const res = existing
        ? await api.patch<{ website: Website }>(`/websites/${existing.id}`, body)
        : await api.post<{ website: Website }>("/websites", body);
      onSaved(res.website);
    } catch (e: any) {
      setError(e.message || "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const owners = options.accountOwnership ?? ["Me", "Client", "Shared"];

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={existing ? `Edit ${existing.code}` : "New website"}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? "Saving…" : existing ? "Save changes" : "Create website"}
          </button>
        </>
      }
    >
      {error && <div className="pill pill-crit mb-3 w-full justify-center py-2">{error}</div>}

      <Section title="Project">
        <Field label="Project name"><input className="input" value={d.projectName ?? ""} onChange={(e) => set("projectName", e.target.value)} /></Field>
        <Field label="Status">
          <select className="input" value={d.status ?? "Planning"} onChange={(e) => set("status", e.target.value)}>
            {(options.websiteStatus ?? ["Planning", "In Development", "Live", "Paused", "Cancelled"]).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Primary URL"><input className="input" value={d.primaryUrl ?? ""} onChange={(e) => set("primaryUrl", e.target.value)} /></Field>
        <Field label="Launch date"><input className="input" type="date" value={dateInput(d.launchDate)} onChange={(e) => set("launchDate", e.target.value as any)} /></Field>
      </Section>

      <Section title="Domain">
        <Field label="Domain name"><input className="input" value={d.domainName ?? ""} onChange={(e) => set("domainName", e.target.value)} /></Field>
        <Field label="Provider"><input className="input" value={d.domainProvider ?? ""} onChange={(e) => set("domainProvider", e.target.value)} /></Field>
        <Field label="Account owner">
          <select className="input" value={d.domainOwner ?? ""} onChange={(e) => set("domainOwner", e.target.value)}>
            <option value="">—</option>{owners.map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Renewal date"><input className="input" type="date" value={dateInput(d.domainRenewalDate)} onChange={(e) => set("domainRenewalDate", e.target.value as any)} /></Field>
      </Section>

      <Section title="Hosting">
        <Field label="Provider"><input className="input" value={d.hostingProvider ?? ""} onChange={(e) => set("hostingProvider", e.target.value)} /></Field>
        <Field label="Plan"><input className="input" value={d.hostingPlan ?? ""} onChange={(e) => set("hostingPlan", e.target.value)} /></Field>
        <Field label="Account owner">
          <select className="input" value={d.hostingOwner ?? ""} onChange={(e) => set("hostingOwner", e.target.value)}>
            <option value="">—</option>{owners.map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Renewal date"><input className="input" type="date" value={dateInput(d.hostingRenewalDate)} onChange={(e) => set("hostingRenewalDate", e.target.value as any)} /></Field>
      </Section>

      <Section title="SSL & technical">
        <Field label="SSL expiry date"><input className="input" type="date" value={dateInput(d.sslExpiryDate)} onChange={(e) => set("sslExpiryDate", e.target.value as any)} /></Field>
        <Field label="Deployment platform"><input className="input" value={d.deploymentPlatform ?? ""} onChange={(e) => set("deploymentPlatform", e.target.value)} /></Field>
        <Field label="Repository URL"><input className="input" value={d.repositoryUrl ?? ""} onChange={(e) => set("repositoryUrl", e.target.value)} /></Field>
        <Field label="Admin URL"><input className="input" value={d.adminUrl ?? ""} onChange={(e) => set("adminUrl", e.target.value)} /></Field>
        <Field label="Credential location (reference only)"><input className="input" placeholder="e.g. 1Password → Client X" value={d.credentialLocation ?? ""} onChange={(e) => set("credentialLocation", e.target.value)} /></Field>
      </Section>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>{title}</div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">{children}</div>
    </div>
  );
}
