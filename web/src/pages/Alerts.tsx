import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { daysLabel } from "../lib/format";
import { Page, PageHeader } from "../components/Page";
import { Card, Spinner, ErrorState, EmptyState } from "../components/ui";
import ReminderModal, { type ReminderTarget } from "../components/ReminderModal";

interface Alert {
  type: string;
  severity: "info" | "warn" | "attention" | "critical";
  message: string;
  entity: string;
  entityId: string;
  linkId: string;
  days: number | null;
  reminder?: {
    clientId: string; clientName: string; contactName: string | null; phone: string | null;
    invoiceCode: string; balance: number; daysLate: number; dueDate: string; reminderStatus: string;
  };
}
interface Feed { alerts: Alert[]; counts: Record<string, number>; total: number }

const TONE: Record<string, string> = { critical: "crit", attention: "attn", warn: "warn", info: "info" };

export default function Alerts() {
  const nav = useNavigate();
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [remind, setRemind] = useState<ReminderTarget | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.get<Feed>("/alerts").then(setFeed).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function go(a: Alert) {
    if (a.entity === "website") nav(`/websites/${a.linkId}`);
    else if (a.entity === "expense") nav("/expenses");
    else nav(`/clients/${a.linkId}`);
  }

  const shown = feed?.alerts.filter((a) => filter === "all" || a.severity === filter) ?? [];

  return (
    <Page>
      <PageHeader title="Alerts & Reminders" subtitle="Everything that needs attention, updated live"
        actions={<button className="btn btn-sm" onClick={load}>Refresh</button>} />

      {error ? <ErrorState message={error} onRetry={load} /> : loading && !feed ? (
        <div className="py-16 text-center"><span className="inline-block"><Spinner /></span></div>
      ) : feed && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <Chip active={filter === "all"} onClick={() => setFilter("all")} tone="neut" label={`All ${feed.total}`} />
            <Chip active={filter === "critical"} onClick={() => setFilter("critical")} tone="crit" label={`Critical ${feed.counts.critical}`} />
            <Chip active={filter === "attention"} onClick={() => setFilter("attention")} tone="attn" label={`Attention ${feed.counts.attention}`} />
            <Chip active={filter === "warn"} onClick={() => setFilter("warn")} tone="warn" label={`Soon ${feed.counts.warn}`} />
            <Chip active={filter === "info"} onClick={() => setFilter("info")} tone="info" label={`Info ${feed.counts.info}`} />
          </div>

          {shown.length === 0 ? (
            <Card className="p-2"><EmptyState icon="✓" title="Nothing needs attention" hint="You're all caught up" /></Card>
          ) : (
            <Card>
              {shown.map((a, i) => (
                <div key={i} className="flex items-center gap-3 border-b px-4 py-3 last:border-0" style={{ borderColor: "var(--line-2)" }}>
                  <span className={`pill pill-${TONE[a.severity]} shrink-0`}><span className="pill-dot" />{a.severity}</span>
                  <button onClick={() => go(a)} className="min-w-0 flex-1 text-left text-sm" style={{ color: "var(--ink)" }}>{a.message}</button>
                  {a.reminder && (
                    <button className="btn btn-sm shrink-0" onClick={() => setRemind({ ...a.reminder!, invoiceId: a.entityId })}>
                      Remind{a.reminder.reminderStatus !== "Not Sent" ? " ✓" : ""}
                    </button>
                  )}
                  {a.days != null && <span className="shrink-0 text-xs" style={{ color: "var(--muted)" }}>{daysLabel(a.days)}</span>}
                </div>
              ))}
            </Card>
          )}
        </>
      )}
      {remind && <ReminderModal open target={remind} onClose={() => setRemind(null)} onStatusChanged={load} />}
    </Page>
  );
}

function Chip({ active, onClick, tone, label }: { active: boolean; onClick: () => void; tone: string; label: string }) {
  return (
    <button onClick={onClick} className={`pill pill-${tone}`} style={{ outline: active ? "2px solid var(--accent)" : "none", outlineOffset: 1 }}>
      {label}
    </button>
  );
}
