// ---------------------------------------------------------------------------
// Website requests — configurations submitted from the public builder.
//
// Everything here is the SNAPSHOT taken when the customer pressed send, not
// today's catalogue. If a pack's price changes tomorrow, this screen still
// shows what that customer was actually quoted.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { money } from "../lib/format";
import { Page, PageHeader } from "../components/Page";
import { Card, Spinner, ErrorState, EmptyState, Detail, StatusPill } from "../components/ui";

const STATUSES = ["All", "New", "Contacted", "Quoted", "Converted", "Closed"] as const;

interface Line { key: string; name: string; kind?: string; price?: number }
interface Limit { label: string; value: number; unitLabel: string; upgraded: boolean }
interface OneTime { key: string; label: string; amount: number | null; isQuote: boolean }
interface Config {
  id: string; code: string; status: string; createdAt: string;
  contactName: string | null; businessName: string | null; phone: string | null; email: string | null;
  businessType: string | null; notes: string | null;
  systemKeys: string[]; packKeys: string[];
  monthlyTotal: number; oneTimeTotal: number;
  lines: Line[]; quoteItems: { key: string; name: string }[];
  limits: Limit[]; oneTime: OneTime[]; external: { key: string; label: string }[];
  legacyPlanKey: string | null; legacyCoreSystem: string | null;
  salespersonName: string | null; leadId: string | null; leadCode: string | null;
}

export default function WebsiteRequests() {
  const [items, setItems] = useState<Config[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    const params = new URLSearchParams();
    if (status !== "All") params.set("status", status);
    if (q.trim()) params.set("q", q.trim());
    api.get<{ items: Config[] }>(`/configurations?${params}`).then((r) => setItems(r.items)).catch((e) => setError(e.message));
  }, [status, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function setStatusOf(id: string, next: string) {
    await api.patch(`/configurations/${id}`, { status: next });
    load();
  }

  return (
    <Page>
      <PageHeader
        title="Website requests"
        subtitle="Configurations customers built and sent from the website"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className="rounded-full px-3 py-1.5 text-sm font-medium"
            style={{
              border: `1px solid ${status === s ? "var(--accent)" : "var(--line)"}`,
              background: status === s ? "var(--accent)" : "transparent",
              color: status === s ? "#fff" : "var(--muted)",
            }}
          >
            {s}
          </button>
        ))}
        <input
          className="input ml-auto"
          style={{ maxWidth: 260 }}
          placeholder="Search code, business, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!items && !error && <Spinner label="Loading requests" />}
      {items?.length === 0 && (
        <EmptyState icon="◎" title="No website requests yet" hint="Configurations sent from the builder appear here." />
      )}

      <div className="flex flex-col gap-3">
        {items?.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{c.businessName || c.contactName || "—"}</span>
                  <StatusPill status={c.status} />
                </div>
                <div className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>
                  {c.code} · {new Date(c.createdAt).toLocaleDateString()} · {describe(c)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold tabular-nums" style={{ color: "var(--accent)" }}>
                  {money(c.monthlyTotal)}<span className="text-sm font-normal" style={{ color: "var(--muted)" }}>/mo</span>
                </div>
                {c.oneTimeTotal > 0 && (
                  <div className="text-xs" style={{ color: "var(--muted)" }}>+ {money(c.oneTimeTotal)} one-time</div>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {c.phone && <a href={`tel:${c.phone}`} style={{ color: "var(--accent)" }}>{c.phone}</a>}
              {c.email && <a href={`mailto:${c.email}`} style={{ color: "var(--accent)" }}>{c.email}</a>}
              {c.leadCode && <Link to={`/sales/leads/${c.leadId}`} style={{ color: "var(--accent)" }}>Lead {c.leadCode}</Link>}
              {!c.leadCode && <span style={{ color: "var(--muted)" }}>No lead — no active salesperson at the time</span>}
              <button className="ml-auto text-sm font-medium" style={{ color: "var(--accent)" }} onClick={() => setOpen(open === c.id ? null : c.id)}>
                {open === c.id ? "Hide details" : "View details"}
              </button>
            </div>

            {open === c.id && (
              <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--line)" }}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                      Monthly subscription, as quoted
                    </div>
                    {c.lines.length === 0 && <div className="text-sm" style={{ color: "var(--muted)" }}>No snapshot stored.</div>}
                    {c.lines.map((l) => (
                      <div key={l.key} className="flex justify-between py-0.5 text-sm">
                        <span>{l.name}</span>
                        <span className="tabular-nums" style={{ color: "var(--muted)" }}>{money(l.price ?? 0)}</span>
                      </div>
                    ))}
                    <div className="mt-1 flex justify-between border-t pt-1 text-sm font-semibold" style={{ borderColor: "var(--line)" }}>
                      <span>Total</span><span className="tabular-nums">{money(c.monthlyTotal)}/mo</span>
                    </div>

                    {c.limits.length > 0 && (
                      <>
                        <div className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Limits</div>
                        {c.limits.map((l, i) => (
                          <div key={i} className="flex justify-between py-0.5 text-sm">
                            <span>{l.label}</span>
                            <span style={{ color: l.upgraded ? "var(--accent)" : "var(--muted)" }}>
                              {l.value} {l.unitLabel}{l.upgraded ? " (raised)" : ""}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  <div>
                    {c.oneTime.length > 0 && (
                      <>
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>One-time services</div>
                        {c.oneTime.map((o) => (
                          <div key={o.key} className="flex justify-between py-0.5 text-sm">
                            <span>{o.label}</span>
                            <span style={{ color: "var(--muted)" }}>{o.isQuote ? "Needs a quote" : money(o.amount ?? 0)}</span>
                          </div>
                        ))}
                      </>
                    )}
                    {c.external.length > 0 && (
                      <>
                        <div className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>External costs noted</div>
                        <div className="text-sm" style={{ color: "var(--muted)" }}>{c.external.map((e) => e.label).join(", ")}</div>
                      </>
                    )}
                    <div className="mt-4 grid gap-2">
                      <Detail label="Contact">{c.contactName || "—"}</Detail>
                      <Detail label="Business type">{c.businessType || "—"}</Detail>
                      <Detail label="Salesperson">{c.salespersonName || "Unassigned"}</Detail>
                      {c.notes && <Detail label="Notes">{c.notes}</Detail>}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {STATUSES.filter((s) => s !== "All").map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusOf(c.id, s)}
                      disabled={c.status === s}
                      className="rounded-full px-3 py-1.5 text-sm"
                      style={{
                        border: "1px solid var(--line)",
                        background: c.status === s ? "var(--surface-2, #f4f2ef)" : "transparent",
                        color: c.status === s ? "var(--muted)" : "var(--ink)",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </Page>
  );
}

/** "Booking and E-commerce · 3 packs", or the old plan name for legacy rows. */
function describe(c: Config): string {
  if (c.systemKeys.length || c.packKeys.length) {
    const systems = c.systemKeys.length
      ? c.systemKeys.map((k) => (k === "store" ? "E-commerce" : "Booking")).join(" and ")
      : "Informational";
    const packs = c.packKeys.length ? ` · ${c.packKeys.length} pack${c.packKeys.length > 1 ? "s" : ""}` : "";
    return systems + packs;
  }
  if (c.legacyPlanKey) {
    return `${c.legacyPlanKey} plan${c.legacyCoreSystem ? ` (${c.legacyCoreSystem})` : ""} · previous pricing model`;
  }
  return "Informational";
}
