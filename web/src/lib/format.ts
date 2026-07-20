// Formatting + status→color mapping. All dates are rendered in LOCAL time to
// avoid the ISO-string off-by-one that UTC serialization introduces.

let currency = "USD";
export function setCurrency(c: string) {
  currency = c || "USD";
}

export function money(n: number | null | undefined, opts?: { blankZero?: boolean }): string {
  if (n == null) return "—";
  if (opts?.blankZero && n === 0) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

export function num(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat().format(n);
}

export function pct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n}%`;
}

function toDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  const x = new Date(d);
  return isNaN(x.getTime()) ? null : x;
}

export function fmtDate(d: string | Date | null | undefined): string {
  const x = toDate(d);
  if (!x) return "—";
  return x.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function fmtMonth(d: string | Date | null | undefined): string {
  const x = toDate(d);
  if (!x) return "—";
  return x.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

/** "YYYY-MM" key -> "Jul 2026" short label (local, no parsing drift). */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export function daysLabel(days: number | null | undefined): string {
  if (days == null) return "—";
  if (days === 0) return "today";
  if (days < 0) return `${Math.abs(days)}d ago`;
  return `in ${days}d`;
}

// ---- status → pill class -------------------------------------------------
type Tone = "good" | "warn" | "attn" | "crit" | "neut" | "info";

const STATUS_TONE: Record<string, Tone> = {
  // client / website / generic
  Active: "good", Live: "good", OK: "good", Completed: "good",
  Trial: "info", Planning: "info", "In Development": "info", "In Progress": "info",
  Paused: "neut", Cancelled: "neut", "Not Started": "neut", "Not Tracked": "neut", Future: "neut",
  // renewal
  "Due in 60 Days": "warn", "Due in 30 Days": "attn", Expired: "crit",
  // invoice
  "No Charge": "neut", Due: "warn", "Partially Paid": "attn", "Partial – Overdue": "crit",
  Overdue: "crit", "Paid On Time": "good", "Paid Late": "warn", "Not Billed": "neut",
  // support deadline
  "On Track": "good", "Due Soon": "warn", "No Deadline": "neut",
  "Completed On Time": "good", "Completed Late": "warn",
  "Waiting for Client": "warn", "Waiting for Payment": "attn",
  // priority
  Low: "neut", Medium: "info", High: "attn", Urgent: "crit",
  // deposit
  "Not Deposited": "warn", Deposited: "good", "Not Applicable": "neut",
};

export function statusTone(status: string | null | undefined): Tone {
  if (!status) return "neut";
  return STATUS_TONE[status] ?? "neut";
}
