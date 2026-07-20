import type { ReactNode } from "react";
import { statusTone } from "../lib/format";

export function StatusPill({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="pill pill-neut">—</span>;
  return (
    <span className={`pill pill-${statusTone(status)}`}>
      <span className="pill-dot" />
      {status}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm" style={{ color: "var(--muted)" }}>
      <span
        className="inline-block h-4 w-4 rounded-full border-2 animate-spin"
        style={{ borderColor: "var(--line)", borderTopColor: "var(--accent)" }}
      />
      {label ?? "Loading…"}
    </div>
  );
}

export function EmptyState({ icon = "○", title, hint }: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
      <div className="text-2xl opacity-40">{icon}</div>
      <div className="text-sm font-semibold" style={{ color: "var(--ink-2)" }}>{title}</div>
      {hint && <div className="text-xs" style={{ color: "var(--muted)" }}>{hint}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="pill pill-crit">Error</div>
      <div className="text-sm" style={{ color: "var(--ink-2)" }}>{message}</div>
      {onRetry && (
        <button className="btn btn-sm" onClick={onRetry}>Retry</button>
      )}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

/** A labelled value pair used across profile/detail pages. */
export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-1">
      <span className="label">{label}</span>
      <span className="text-sm" style={{ color: "var(--ink)" }}>{children ?? "—"}</span>
    </div>
  );
}
