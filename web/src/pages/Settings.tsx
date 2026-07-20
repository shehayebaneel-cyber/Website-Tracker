import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { money } from "../lib/format";
import { Page, PageHeader } from "../components/Page";
import { Card, Spinner, Field, StatusPill } from "../components/ui";

const TABS = ["Company", "Dropdown Lists", "Users", "Data"] as const;
type Tab = (typeof TABS)[number];

export default function Settings() {
  const [tab, setTab] = useState<Tab>("Company");
  return (
    <Page>
      <PageHeader title="Settings" subtitle="Company details, dropdown lists, users and data" />
      <div className="mb-4 flex gap-1 overflow-x-auto border-b" style={{ borderColor: "var(--line)" }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="relative whitespace-nowrap px-3.5 py-2.5 text-sm font-medium" style={{ color: tab === t ? "var(--accent)" : "var(--muted)" }}>
            {t}
            {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded" style={{ background: "var(--accent)" }} />}
          </button>
        ))}
      </div>
      {tab === "Company" && <CompanyTab />}
      {tab === "Dropdown Lists" && <OptionsTab />}
      {tab === "Users" && <UsersTab />}
      {tab === "Data" && <DataTab />}
    </Page>
  );
}

// ---------------------------------------------------------------------------
function CompanyTab() {
  const [cfg, setCfg] = useState<Record<string, string> | null>(null);
  const [company, setCompany] = useState({ name: "", email: "" });
  const [currency, setCurrency] = useState("USD");
  const [billingDay, setBillingDay] = useState("1");
  const [reminders, setReminders] = useState("60,30");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ config: Record<string, string> }>("/settings").then((r) => {
      setCfg(r.config);
      setCurrency(r.config.currency || "USD");
      setBillingDay(r.config.defaultBillingDay || "1");
      try { const c = JSON.parse(r.config.company || "{}"); setCompany({ name: c.name || "", email: c.email || "" }); } catch { /* ignore */ }
      try { setReminders((JSON.parse(r.config.reminderWindowDays || "[60,30]") as number[]).join(",")); } catch { /* ignore */ }
    });
  }, []);

  async function save() {
    setBusy(true); setSaved(false);
    await api.patch("/settings/config", {
      currency, defaultBillingDay: billingDay, company,
      reminderWindowDays: reminders.split(",").map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n)),
    });
    setSaved(true); setBusy(false);
  }

  if (!cfg) return <Spinner />;
  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Company name"><input className="input" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} /></Field>
        <Field label="Company email"><input className="input" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} /></Field>
        <Field label="Currency"><input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} /></Field>
        <Field label="Default billing day"><input className="input tnum" type="number" min={1} max={31} value={billingDay} onChange={(e) => setBillingDay(e.target.value)} /></Field>
        <Field label="Reminder windows (days before, comma-separated)"><input className="input" value={reminders} onChange={(e) => setReminders(e.target.value)} /></Field>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
        {saved && <span className="pill pill-good">Saved</span>}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
const LIST_LABELS: Record<string, string> = {
  clientStatus: "Client statuses", websiteStatus: "Website statuses", servicePlan: "Service plans",
  paymentMethod: "Payment methods", chargeType: "Charge types", expenseCategory: "Expense categories",
  supportCategory: "Support categories", supportStatus: "Support statuses", priority: "Priorities",
  requestSource: "Request sources", renewalFrequency: "Renewal frequencies", accountOwnership: "Account ownership",
  reminderStatus: "Reminder statuses", depositStatus: "Deposit statuses", reimbursementStatus: "Reimbursement statuses",
};

function OptionsTab() {
  const [options, setOptions] = useState<Record<string, { id: string; value: string; active: boolean }[]> | null>(null);
  const [adding, setAdding] = useState<Record<string, string>>({});

  function load() { api.get<{ options: any }>("/settings").then((r) => setOptions(r.options)); }
  useEffect(load, []);

  async function add(listKey: string) {
    const value = (adding[listKey] || "").trim();
    if (!value) return;
    await api.post("/settings/options", { listKey, value });
    setAdding({ ...adding, [listKey]: "" });
    load();
  }
  async function disable(id: string) { await api.del(`/settings/options/${id}`); load(); }
  async function enable(id: string) { await api.post(`/settings/options/${id}/enable`); load(); }

  if (!options) return <Spinner />;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Object.keys(options).sort().map((key) => (
        <Card key={key} className="p-4">
          <div className="mb-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>{LIST_LABELS[key] ?? key}</div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {options[key].map((o) => (
              <span key={o.id} className={`pill ${o.active ? "pill-neut" : "pill-crit"} gap-1.5`} style={{ opacity: o.active ? 1 : 0.6 }}>
                {o.value}
                {o.active
                  ? <button title="Disable" onClick={() => disable(o.id)} style={{ color: "var(--muted)" }}>×</button>
                  : <button title="Enable" onClick={() => enable(o.id)} style={{ color: "var(--good)" }}>↺</button>}
              </span>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input className="input" style={{ height: 32 }} placeholder="Add value…" value={adding[key] ?? ""} onChange={(e) => setAdding({ ...adding, [key]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && add(key)} />
            <button className="btn btn-sm" onClick={() => add(key)}>Add</button>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
interface User { id: string; email: string; name: string; role: string; active: boolean; lastLoginAt: string | null }
function UsersTab() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "STAFF", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() { api.get<{ users: User[] }>("/users").then((r) => setUsers(r.users)); }
  useEffect(load, []);

  async function create() {
    setBusy(true); setError(null);
    try {
      await api.post("/users", form);
      setForm({ name: "", email: "", role: "STAFF", password: "" });
      load();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function update(id: string, data: any) { try { await api.patch(`/users/${id}`, data); load(); } catch (e: any) { alert(e.message); } }

  if (!users) return <Spinner />;
  return (
    <div className="flex flex-col gap-4">
      <Card>
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-0" style={{ borderColor: "var(--line-2)" }}>
            <div className="min-w-0 flex-1">
              <div className="font-medium" style={{ color: "var(--ink)" }}>{u.name}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>{u.email}</div>
            </div>
            <select className="input" style={{ width: "auto", height: 32 }} value={u.role} onChange={(e) => update(u.id, { role: e.target.value })}>
              {["OWNER", "STAFF", "DEVELOPER"].map((r) => <option key={r}>{r}</option>)}
            </select>
            <StatusPill status={u.active ? "Active" : "Cancelled"} />
            <button className="btn btn-sm" onClick={() => update(u.id, { active: !u.active })}>{u.active ? "Disable" : "Enable"}</button>
          </div>
        ))}
      </Card>

      <Card className="p-4">
        <div className="mb-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>Add a user</div>
        {error && <div className="pill pill-crit mb-3 w-full justify-center py-2">{error}</div>}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Role">
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {["OWNER", "STAFF", "DEVELOPER"].map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Password (min 8 chars)"><input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        </div>
        <button className="btn btn-primary mt-4" onClick={create} disabled={busy || !form.name || !form.email || form.password.length < 8}>{busy ? "Creating…" : "Create user"}</button>
        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>Staff can manage clients & finances; Developer sees only websites, support and renewals.</p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
function DataTab() {
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<{ rows: any[]; summary: any } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function doPreview() {
    setBusy(true); setResult(null);
    try { setPreview(await api.post("/import/clients/preview", { csv })); }
    catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }
  async function commit() {
    if (!preview) return;
    setBusy(true);
    const rows = preview.rows.filter((r) => r.status === "new").map((r) => r.data);
    try {
      const r = await api.post<{ created: number; skipped: string[] }>("/import/clients/commit", { rows });
      setResult(`Imported ${r.created} client(s)${r.skipped.length ? `, skipped ${r.skipped.length}` : ""}.`);
      setPreview(null); setCsv("");
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  const exports: [string, string][] = [
    ["Clients", "/api/export/clients.csv"], ["Websites", "/api/export/websites.csv"],
    ["Invoices", "/api/export/invoices.csv"], ["Payments", "/api/export/payments.csv"],
    ["Expenses", "/api/export/expenses.csv"], ["Support", "/api/export/support.csv"],
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="mb-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>Export to CSV (opens in Excel)</div>
        <div className="flex flex-wrap gap-2">{exports.map(([l, h]) => <a key={l} className="btn btn-sm" href={h}>⤓ {l}</a>)}</div>
      </Card>

      <Card className="p-4">
        <div className="mb-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>Import clients from CSV</div>
        <p className="mb-2 text-xs" style={{ color: "var(--muted)" }}>Header row required. Columns: Business Name, Contact Name, Phone, City, Monthly Fee, Service Plan, Billing Day, Status.</p>
        <textarea className="input" rows={5} placeholder={"Business Name,Phone,Monthly Fee,Service Plan\nAcme Cafe,+961...,25,Standard"} value={csv} onChange={(e) => setCsv(e.target.value)} />
        <div className="mt-3 flex items-center gap-3">
          <button className="btn" onClick={doPreview} disabled={busy || !csv.trim()}>Preview</button>
          {preview && <button className="btn btn-primary" onClick={commit} disabled={busy || preview.summary.new === 0}>Import {preview.summary.new} new</button>}
          {result && <span className="pill pill-good">{result}</span>}
        </div>

        {preview && (
          <div className="mt-3">
            <div className="mb-2 flex gap-2 text-xs">
              <span className="pill pill-good">{preview.summary.new} new</span>
              <span className="pill pill-warn">{preview.summary.duplicate} duplicate</span>
              <span className="pill pill-crit">{preview.summary.invalid} invalid</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="border-b" style={{ borderColor: "var(--line)" }}>
                  {["", "Business", "Phone", "Fee", "Plan"].map((h) => <th key={h} className="px-2 py-1.5 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {preview.rows.map((r, i) => (
                    <tr key={i} className="border-b" style={{ borderColor: "var(--line-2)", opacity: r.status === "new" ? 1 : 0.55 }}>
                      <td className="px-2 py-1.5"><StatusPill status={r.status === "new" ? "OK" : r.status === "duplicate" ? "Due" : "Overdue"} /></td>
                      <td className="px-2 py-1.5">{r.data.businessName || "—"}</td>
                      <td className="px-2 py-1.5">{r.data.phone || "—"}</td>
                      <td className="px-2 py-1.5 tnum">{money(r.data.monthlyFee)}</td>
                      <td className="px-2 py-1.5">{r.data.servicePlan || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
