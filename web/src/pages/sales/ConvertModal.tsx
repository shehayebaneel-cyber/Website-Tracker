import { useState } from "react";
import { api } from "../../lib/api";
import { useOptions } from "../../lib/useOptions";
import type { Lead } from "../../lib/salesTypes";
import { money } from "../../lib/format";
import { Modal } from "../../components/Modal";
import { Field } from "../../components/ui";

// Convert a lead into a client. Shows the agreed subscription + commission and
// requires the admin to confirm before creating the client, website + assignment.
export default function ConvertModal({
  open, onClose, onConverted, lead,
}: {
  open: boolean;
  onClose: () => void;
  onConverted: (clientId: string) => void;
  lead: Lead;
}) {
  const options = useOptions();
  const [projectName, setProjectName] = useState(lead.businessName);
  const [monthlyFee, setMonthlyFee] = useState(lead.proposedMonthly ?? 20);
  const [setupFee, setSetupFee] = useState(lead.proposedSetup ?? 0);
  const [billingDay, setBillingDay] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [servicePlan, setServicePlan] = useState("Basic");
  const [commissionMethod, setCommissionMethod] = useState("Fixed");
  const [commissionAmount, setCommissionAmount] = useState(5);
  const [commissionPercent, setCommissionPercent] = useState(25);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commissionPreview = commissionMethod === "Fixed" ? commissionAmount : (monthlyFee * commissionPercent) / 100;

  async function convert() {
    setBusy(true); setError(null);
    try {
      const r = await api.post<{ clientId: string }>(`/leads/${lead.id}/convert`, {
        projectName, monthlyFee, setupFee, billingDay, subscriptionStartDate: startDate, servicePlan,
        commissionMethod, commissionAmount, commissionPercent,
      });
      onConverted(r.clientId);
    } catch (e: any) { setError(e.message || "Could not convert"); } finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} wide title={`Convert ${lead.businessName} to a client`}
      footer={<>
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={convert} disabled={busy}>{busy ? "Converting…" : "Confirm & create client"}</button>
      </>}>
      {error && <div className="pill pill-crit mb-3 w-full justify-center py-2">{error}</div>}

      <div className="mb-4 rounded-lg border p-3" style={{ borderColor: "var(--accent)", background: "var(--accent-soft)" }}>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div><div className="label">Client</div><div className="font-semibold">{lead.businessName}</div></div>
          <div><div className="label">Salesperson</div><div className="font-semibold">{lead.salespersonName ?? "—"}</div></div>
          <div><div className="label">Monthly</div><div className="tnum font-semibold">{money(monthlyFee)}</div></div>
          <div><div className="label">Commission</div><div className="tnum font-semibold" style={{ color: "var(--accent)" }}>{money(commissionPreview)}/mo</div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Website / project name"><input className="input" value={projectName} onChange={(e) => setProjectName(e.target.value)} /></Field>
        <Field label="Service plan">
          <select className="input" value={servicePlan} onChange={(e) => setServicePlan(e.target.value)}>
            {(options.servicePlan ?? ["Basic"]).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Monthly subscription ($)"><input className="input tnum" type="number" min={0} step="0.01" value={monthlyFee} onChange={(e) => setMonthlyFee(Number(e.target.value))} /></Field>
        <Field label="Setup fee ($)"><input className="input tnum" type="number" min={0} step="0.01" value={setupFee} onChange={(e) => setSetupFee(Number(e.target.value))} /></Field>
        <Field label="Billing day"><input className="input tnum" type="number" min={1} max={31} value={billingDay} onChange={(e) => setBillingDay(Number(e.target.value))} /></Field>
        <Field label="Subscription start"><input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
        <Field label="Commission method">
          <select className="input" value={commissionMethod} onChange={(e) => setCommissionMethod(e.target.value)}>
            <option value="Fixed">Fixed amount</option>
            <option value="Percentage">Percentage of collected</option>
          </select>
        </Field>
        {commissionMethod === "Fixed"
          ? <Field label="Commission ($/paid month)"><input className="input tnum" type="number" min={0} step="0.01" value={commissionAmount} onChange={(e) => setCommissionAmount(Number(e.target.value))} /></Field>
          : <Field label="Commission (%)"><input className="input tnum" type="number" min={0} max={100} step="0.5" value={commissionPercent} onChange={(e) => setCommissionPercent(Number(e.target.value))} /></Field>}
      </div>
      <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
        This creates the client, its first website and the salesperson assignment. You can create the first invoice afterwards from the client's profile.
      </p>
    </Modal>
  );
}
