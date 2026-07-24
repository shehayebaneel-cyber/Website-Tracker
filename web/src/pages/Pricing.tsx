// ---------------------------------------------------------------------------
// The pricing catalogue editor.
//
// Section 24 of the spec: every price, limit, description and rule the public
// website shows is changed here, and takes effect immediately — the public
// pages read the catalogue at runtime, so nothing is rebuilt or redeployed.
//
// The maximum standard monthly price shown at the top is DERIVED from what is
// on this screen (base + every system + every pack), so an edit that would
// break the advertised ceiling is visible the moment it is made.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { Page, PageHeader } from "../components/Page";
import { Card, Spinner, ErrorState, Field } from "../components/ui";

const TABS = [
  "Base website", "Core systems", "Feature packs", "One-time services",
  "External costs", "Comparison", "Examples", "FAQ & terms", "Page text",
] as const;
type Tab = (typeof TABS)[number];

interface Row { id: string; [k: string]: any }
interface Catalogue {
  base: Row & { inclusions: Row[] };
  systems: (Row & { inclusions: Row[]; limits: Row[] })[];
  packs: (Row & { features: Row[] })[];
  oneTime: Row[];
  external: Row[];
  comparison: Row[];
  setups: Row[];
  faqs: Row[];
  terms: Row[];
  businessTypes: Row[];
  content: Row[];
  maxStandardMonthly: number;
}

export default function Pricing() {
  const [tab, setTab] = useState<Tab>("Base website");
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api.get<Catalogue>("/pricing-admin").then(setCat).catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  if (error) return <Page><PageHeader title="Website pricing" /><ErrorState message={error} onRetry={load} /></Page>;
  if (!cat) return <Page><PageHeader title="Website pricing" /><Spinner label="Loading the catalogue" /></Page>;

  return (
    <Page>
      <PageHeader
        title="Website pricing"
        subtitle="What the public website offers, and what it costs. Changes are live immediately."
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-6">
          <Stat label="Base website" value={`$${cat.base?.price ?? 0}/mo`} />
          {cat.systems.filter((s) => s.active).map((s) => (
            <Stat key={s.id} label={s.shortName} value={`+$${s.price}/mo`} />
          ))}
          <Stat label={`${cat.packs.filter((p) => p.active).length} packs`} value={`+$${cat.packs[0]?.price ?? 0}/mo each`} />
          <Stat label="Standard maximum" value={`$${cat.maxStandardMonthly}/mo`} accent />
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
          The maximum is base + every system + every pack. It is calculated from this page, so it always
          matches what a customer can actually select.
        </p>
      </Card>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b" style={{ borderColor: "var(--line)" }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="relative whitespace-nowrap px-3.5 py-2.5 text-sm font-medium" style={{ color: tab === t ? "var(--accent)" : "var(--muted)" }}>
            {t}
            {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded" style={{ background: "var(--accent)" }} />}
          </button>
        ))}
      </div>

      {tab === "Base website" && <BaseTab cat={cat} reload={load} />}
      {tab === "Core systems" && <SystemsTab cat={cat} reload={load} />}
      {tab === "Feature packs" && <PacksTab cat={cat} reload={load} />}
      {tab === "One-time services" && (
        <SimpleTable
          rows={cat.oneTime} path="one-time" reload={load}
          columns={[
            { key: "name", label: "Service" },
            { key: "category", label: "Category", width: 120 },
            { key: "startingPrice", label: "From $", width: 100, type: "number" },
            { key: "isQuote", label: "Quote only", width: 100, type: "boolean" },
            { key: "description", label: "Description" },
          ]}
          hint="Charged once. A service marked “quote only” never shows a price and never enters a total."
        />
      )}
      {tab === "External costs" && (
        <SimpleTable
          rows={cat.external} path="external" reload={load}
          columns={[
            { key: "name", label: "Cost" },
            { key: "provider", label: "Provider", width: 160 },
            { key: "costType", label: "Type", width: 120 },
            { key: "description", label: "Description" },
          ]}
          hint="Paid to another company. Shown to the customer, never added to any IGNIS total."
        />
      )}
      {tab === "Comparison" && (
        <SimpleTable
          rows={cat.comparison} path="comparison" reload={load} keyless
          columns={[
            { key: "label", label: "Feature" },
            { key: "informational", label: "Informational", width: 150 },
            { key: "booking", label: "Booking", width: 150 },
            { key: "store", label: "E-commerce", width: 150 },
            { key: "both", label: "Both", width: 150 },
            { key: "note", label: "Note" },
          ]}
          hint="Free text per column, so a cell can say “Requires E-commerce” rather than a misleading tick."
        />
      )}
      {tab === "Examples" && <SetupsTab cat={cat} reload={load} />}
      {tab === "FAQ & terms" && (
        <div className="flex flex-col gap-6">
          <SimpleTable
            rows={cat.faqs} path="faqs" reload={load} keyless title="Pricing FAQ"
            columns={[{ key: "question", label: "Question" }, { key: "answer", label: "Answer", type: "textarea" }]}
          />
          <SimpleTable
            rows={cat.terms} path="terms" reload={load} keyless title="Terms and glossary"
            columns={[
              { key: "kind", label: "Kind", width: 110 },
              { key: "title", label: "Title", width: 180 },
              { key: "body", label: "Text", type: "textarea" },
            ]}
            hint="“term” appears in the pricing terms list; “glossary” becomes a definition on the FAQ page."
          />
        </div>
      )}
      {tab === "Page text" && (
        <SimpleTable
          rows={cat.content} path="content" reload={load}
          columns={[
            { key: "key", label: "Key", width: 230, readOnly: true },
            { key: "label", label: "What it is", width: 220 },
            { key: "value", label: "Text", type: "textarea" },
          ]}
          hint="Headings, notes and the questionnaire's questions. The website asks for a key and never holds the sentence."
        />
      )}
    </Page>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="text-lg font-semibold tabular-nums" style={{ color: accent ? "var(--accent)" : "var(--ink)" }}>{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function useSave(reload: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      reload();
    } catch (e: any) {
      setError(e.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  return { run, busy, error, saved };
}

function SaveBar({ busy, error, saved, onSave, children }: { busy: boolean; error: string | null; saved: boolean; onSave: () => void; children?: ReactNode }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button className="btn btn-primary" disabled={busy} onClick={onSave}>{busy ? "Saving…" : "Save changes"}</button>
      {children}
      {saved && <span className="text-sm" style={{ color: "var(--good, #2f855a)" }}>Saved. The website is already showing it.</span>}
      {error && <span className="text-sm" style={{ color: "var(--bad, #c0392b)" }}>{error}</span>}
    </div>
  );
}

/** An ordered bullet list, edited as plain lines. */
function ListEditor({ value, onChange, label }: { value: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <Field label={`${label} (one per line, in order)`}>
      <textarea
        className="input"
        rows={Math.min(22, Math.max(6, value.length + 1))}
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
      />
    </Field>
  );
}

// ---------------------------------------------------------------------------

function BaseTab({ cat, reload }: { cat: Catalogue; reload: () => void }) {
  const base = cat.base;
  const [form, setForm] = useState({ ...base });
  const [inclusions, setInclusions] = useState<string[]>(base.inclusions.map((i) => i.label));
  const { run, busy, error, saved } = useSave(reload);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card className="p-5">
      <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
        Every customer starts here. This price is included in every configuration, so changing it moves
        every total on the website.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name"><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Price ($/month)"><input className="input" type="number" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} /></Field>
        <Field label="Heading"><input className="input" value={form.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
        <Field label="Button label"><input className="input" value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} /></Field>
        <Field label="Included sections"><input className="input" type="number" value={form.includedSections} onChange={(e) => set("includedSections", e.target.value)} /></Field>
        <Field label="Small updates per month"><input className="input" type="number" value={form.monthlyUpdates} onChange={(e) => set("monthlyUpdates", e.target.value)} /></Field>
      </div>
      <div className="mt-4">
        <Field label="Description"><textarea className="input" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
      </div>
      <div className="mt-4">
        <ListEditor label="What the base website includes" value={inclusions} onChange={setInclusions} />
      </div>
      <SaveBar
        busy={busy} error={error} saved={saved}
        onSave={() =>
          run(async () => {
            await api.patch(`/pricing-admin/base/${base.id}`, {
              name: form.name, heading: form.heading, description: form.description, ctaLabel: form.ctaLabel,
              price: form.price, includedSections: form.includedSections, monthlyUpdates: form.monthlyUpdates,
            });
            await api.put(`/pricing-admin/base/${base.id}/inclusions`, {
              labels: inclusions.map((s) => s.trim()).filter(Boolean),
            });
          })
        }
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------

function SystemsTab({ cat, reload }: { cat: Catalogue; reload: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      {cat.systems.map((s) => <SystemCard key={s.id} system={s} reload={reload} />)}
    </div>
  );
}

function SystemCard({ system, reload }: { system: Row & { inclusions: Row[]; limits: Row[] }; reload: () => void }) {
  const [form, setForm] = useState({ ...system });
  const [inclusions, setInclusions] = useState<string[]>(system.inclusions.map((i) => i.label));
  const [limits, setLimits] = useState<Row[]>(system.limits.map((l) => ({ ...l })));
  const { run, busy, error, saved } = useSave(reload);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{system.name}</h3>
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
          Shown on the website
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Name"><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Short name"><input className="input" value={form.shortName} onChange={(e) => set("shortName", e.target.value)} /></Field>
        <Field label="Price ($/month)"><input className="input" type="number" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} /></Field>
        <Field label="Heading"><input className="input" value={form.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
        <Field label="Button label"><input className="input" value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} /></Field>
        <Field label="Order"><input className="input" type="number" value={form.order} onChange={(e) => set("order", e.target.value)} /></Field>
      </div>
      <div className="mt-4">
        <Field label="Description"><textarea className="input" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-sm font-semibold">Limits</div>
        <p className="mb-2 text-xs" style={{ color: "var(--muted)" }}>
          The upgraded value is what the customer gets with the pack marked “raises limits”.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "var(--muted)" }}>
                <th className="p-2 text-left font-medium">Limit</th>
                <th className="p-2 text-left font-medium">Unit</th>
                <th className="p-2 text-left font-medium">Standard</th>
                <th className="p-2 text-left font-medium">Upgraded</th>
              </tr>
            </thead>
            <tbody>
              {limits.map((l, i) => (
                <tr key={l.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td className="p-2"><input className="input" value={l.label} onChange={(e) => setLimits((ls) => ls.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} /></td>
                  <td className="p-2"><input className="input" value={l.unitLabel} onChange={(e) => setLimits((ls) => ls.map((x, j) => j === i ? { ...x, unitLabel: e.target.value } : x))} /></td>
                  <td className="p-2" style={{ width: 110 }}><input className="input" type="number" value={l.baseValue} onChange={(e) => setLimits((ls) => ls.map((x, j) => j === i ? { ...x, baseValue: e.target.value } : x))} /></td>
                  <td className="p-2" style={{ width: 110 }}><input className="input" type="number" value={l.upgradedValue} onChange={(e) => setLimits((ls) => ls.map((x, j) => j === i ? { ...x, upgradedValue: e.target.value } : x))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <ListEditor label="What this system includes" value={inclusions} onChange={setInclusions} />
      </div>

      <SaveBar
        busy={busy} error={error} saved={saved}
        onSave={() =>
          run(async () => {
            await api.patch(`/pricing-admin/systems/${system.id}`, {
              name: form.name, shortName: form.shortName, heading: form.heading, description: form.description,
              ctaLabel: form.ctaLabel, price: form.price, order: Number(form.order), active: form.active,
            });
            for (const l of limits) {
              await api.patch(`/pricing-admin/limits/${l.id}`, {
                label: l.label, unitLabel: l.unitLabel,
                baseValue: Number(l.baseValue), upgradedValue: Number(l.upgradedValue),
              });
            }
            await api.put(`/pricing-admin/systems/${system.id}/inclusions`, {
              labels: inclusions.map((s) => s.trim()).filter(Boolean),
            });
          })
        }
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------

function PacksTab({ cat, reload }: { cat: Catalogue; reload: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      {cat.packs.map((p) => <PackCard key={p.id} pack={p} systems={cat.systems} reload={reload} />)}
    </div>
  );
}

function PackCard({ pack, systems, reload }: { pack: Row & { features: Row[] }; systems: Row[]; reload: () => void }) {
  const [form, setForm] = useState({ ...pack });
  const [features, setFeatures] = useState<string[]>(pack.features.map((f) => f.label));
  const { run, busy, error, saved } = useSave(reload);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const toggleIn = (field: "requiresSystems" | "compatibleSystems", key: string) => {
    const current: string[] = form[field] ?? [];
    set(field, current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{pack.name}</h3>
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
          Shown on the website
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Name"><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Price ($/month)"><input className="input" type="number" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} /></Field>
        <Field label="Order"><input className="input" type="number" value={form.order} onChange={(e) => set("order", e.target.value)} /></Field>
      </div>

      <div className="mt-4 grid gap-4">
        <Field label="One-line description (on the card)"><input className="input" value={form.blurb} onChange={(e) => set("blurb", e.target.value)} /></Field>
        <Field label="Full description (when expanded)"><textarea className="input" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-1.5 text-sm font-medium">Requires (cannot work without)</div>
          <div className="flex flex-wrap gap-2">
            {systems.map((s) => (
              <Toggle key={s.id} on={(form.requiresSystems ?? []).includes(s.key)} onClick={() => toggleIn("requiresSystems", s.key)}>
                {s.shortName}
              </Toggle>
            ))}
          </div>
          <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
            Leave both off if the pack works with any system. A pack always needs at least one system.
          </p>
        </div>
        <div>
          <div className="mb-1.5 text-sm font-medium">Compatible with</div>
          <div className="flex flex-wrap gap-2">
            {systems.map((s) => (
              <Toggle key={s.id} on={(form.compatibleSystems ?? []).includes(s.key)} onClick={() => toggleIn("compatibleSystems", s.key)}>
                {s.shortName}
              </Toggle>
            ))}
          </div>
          <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>Leave both off for “any system”.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Why it is required (shown to the customer)">
          <input className="input" value={form.requiresReason ?? ""} onChange={(e) => set("requiresReason", e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" checked={form.raisesLimits} onChange={(e) => set("raisesLimits", e.target.checked)} />
          This pack raises every system limit
        </label>
      </div>

      <div className="mt-4">
        <ListEditor label="What this pack includes" value={features} onChange={setFeatures} />
      </div>

      <SaveBar
        busy={busy} error={error} saved={saved}
        onSave={() =>
          run(async () => {
            await api.patch(`/pricing-admin/packs/${pack.id}`, {
              name: form.name, blurb: form.blurb, description: form.description, price: form.price,
              requiresSystems: form.requiresSystems ?? [], compatibleSystems: form.compatibleSystems ?? [],
              requiresReason: form.requiresReason || null, raisesLimits: form.raisesLimits,
              order: Number(form.order), active: form.active,
            });
            await api.put(`/pricing-admin/packs/${pack.id}/features`, {
              labels: features.map((s) => s.trim()).filter(Boolean),
            });
          })
        }
      />
    </Card>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-sm font-medium"
      style={{
        border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
        background: on ? "var(--accent)" : "transparent",
        color: on ? "#fff" : "var(--muted)",
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------

function SetupsTab({ cat, reload }: { cat: Catalogue; reload: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Worked examples on the pricing page. Their totals are calculated from the systems and packs
        selected here, so an example can never advertise a price its own contents contradict.
      </p>
      {cat.setups.map((s) => <SetupCard key={s.id} setup={s} cat={cat} reload={reload} />)}
    </div>
  );
}

function SetupCard({ setup, cat, reload }: { setup: Row; cat: Catalogue; reload: () => void }) {
  const [form, setForm] = useState({ ...setup });
  const { run, busy, error, saved } = useSave(reload);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const toggle = (field: "systemKeys" | "packKeys", key: string) => {
    const current: string[] = form[field] ?? [];
    set(field, current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
  };

  // The same arithmetic the website will do.
  const total =
    (cat.base?.price ?? 0) +
    cat.systems.filter((s) => (form.systemKeys ?? []).includes(s.key)).reduce((t, s) => t + Number(s.price), 0) +
    cat.packs.filter((p) => (form.packKeys ?? []).includes(p.key)).reduce((t, p) => t + Number(p.price), 0);

  return (
    <Card className="p-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Name"><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Description"><input className="input" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Order"><input className="input" type="number" value={form.order} onChange={(e) => set("order", e.target.value)} /></Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {cat.systems.map((s) => (
          <Toggle key={s.id} on={(form.systemKeys ?? []).includes(s.key)} onClick={() => toggle("systemKeys", s.key)}>{s.shortName}</Toggle>
        ))}
        {cat.packs.map((p) => (
          <Toggle key={p.id} on={(form.packKeys ?? []).includes(p.key)} onClick={() => toggle("packKeys", p.key)}>{p.name}</Toggle>
        ))}
      </div>
      <div className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
        This example will show <b style={{ color: "var(--accent)" }}>${total}/month</b>.
      </div>
      <SaveBar
        busy={busy} error={error} saved={saved}
        onSave={() =>
          run(() =>
            api.patch(`/pricing-admin/setups/${setup.id}`, {
              name: form.name, description: form.description, order: Number(form.order),
              systemKeys: form.systemKeys ?? [], packKeys: form.packKeys ?? [], active: form.active,
            })
          )
        }
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------

interface Column {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean" | "textarea";
  readOnly?: boolean;
}

/** A plain editable table for the flat entities. */
function SimpleTable({
  rows, path, reload, columns, hint, title, keyless,
}: {
  rows: Row[]; path: string; reload: () => void; columns: Column[];
  hint?: string; title?: string; keyless?: boolean;
}) {
  const [draft, setDraft] = useState<Record<string, Row>>({});
  const { run, busy, error, saved } = useSave(reload);

  const value = (row: Row, col: Column) => draft[row.id]?.[col.key] ?? row[col.key] ?? "";
  const edit = (row: Row, key: string, v: unknown) =>
    setDraft((d) => ({ ...d, [row.id]: { ...(d[row.id] ?? { id: row.id }), [key]: v } }));

  return (
    <Card className="p-5">
      {title && <h3 className="mb-2 text-base font-semibold">{title}</h3>}
      {hint && <p className="mb-3 text-sm" style={{ color: "var(--muted)" }}>{hint}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: "var(--muted)" }}>
              {columns.map((c) => <th key={c.key} className="p-2 text-left font-medium" style={{ width: c.width }}>{c.label}</th>)}
              <th className="p-2 text-left font-medium" style={{ width: 90 }}>Shown</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} style={{ borderTop: "1px solid var(--line)" }}>
                {columns.map((c) => (
                  <td key={c.key} className="p-2 align-top">
                    {c.readOnly ? (
                      <span className="text-xs" style={{ color: "var(--muted)" }}>{row[c.key]}</span>
                    ) : c.type === "boolean" ? (
                      <input type="checkbox" checked={Boolean(value(row, c))} onChange={(e) => edit(row, c.key, e.target.checked)} />
                    ) : c.type === "textarea" ? (
                      <textarea className="input" rows={2} value={String(value(row, c))} onChange={(e) => edit(row, c.key, e.target.value)} />
                    ) : (
                      <input
                        className="input"
                        type={c.type === "number" ? "number" : "text"}
                        step={c.type === "number" ? "0.01" : undefined}
                        value={String(value(row, c))}
                        onChange={(e) => edit(row, c.key, e.target.value)}
                      />
                    )}
                  </td>
                ))}
                <td className="p-2 align-top">
                  <input
                    type="checkbox"
                    checked={draft[row.id]?.active ?? row.active}
                    onChange={(e) => edit(row, "active", e.target.checked)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SaveBar
        busy={busy} error={error} saved={saved}
        onSave={() =>
          run(async () => {
            for (const [id, changes] of Object.entries(draft)) {
              const { id: _ignored, ...body } = changes;
              await api.patch(`/pricing-admin/${path}/${id}`, body);
            }
            setDraft({});
          })
        }
      >
        {Object.keys(draft).length > 0 && (
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            {Object.keys(draft).length} row{Object.keys(draft).length > 1 ? "s" : ""} changed
          </span>
        )}
        {keyless && <span className="text-xs" style={{ color: "var(--muted)" }}>Rows are added and removed by IGNIS.</span>}
      </SaveBar>
    </Card>
  );
}
