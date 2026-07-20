// ---------------------------------------------------------------------------
// Shared calculation layer.
//
// The single source of truth for every DERIVED value in the system. Nothing
// here is stored in the database — balances, statuses, days-remaining and the
// like are always computed from the raw records so they can never drift the way
// the original spreadsheet's broken formulas did.
//
// All money is handled as plain JS numbers here (2-dp values from Prisma
// Decimal are converted at the boundary). Rounding is applied so floating-point
// noise never produces a phantom 0.01 balance.
// ---------------------------------------------------------------------------

export type RenewalStatus =
  | "Not Tracked"
  | "OK"
  | "Due in 60 Days"
  | "Due in 30 Days"
  | "Expired";

export type InvoiceStatus =
  | "No Charge"
  | "Due"
  | "Partially Paid"
  | "Partial – Overdue"
  | "Overdue"
  | "Paid On Time"
  | "Paid Late";

export type DeadlineStatus =
  | "No Deadline"
  | "On Track"
  | "Due Soon"
  | "Overdue"
  | "Completed On Time"
  | "Completed Late";

export type MonthCellStatus =
  | "Future"
  | "Not Started"
  | "Not Billed"
  | "Due"
  | "Partially Paid"
  | "Overdue"
  | "Paid On Time"
  | "Paid Late"
  | "Cancelled";

const MS_PER_DAY = 86_400_000;

/** Round to 2 decimals, killing float noise (e.g. 19.999999 -> 20). */
export function money(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function toNum(v: unknown): number {
  if (v == null) return 0;
  // Prisma Decimal has a toString; Number() handles it.
  const n = typeof v === "number" ? v : Number(v.toString());
  return Number.isFinite(n) ? n : 0;
}

/** Midnight-normalised "today" so day-diffs are stable within a request. */
export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Whole days from today until `date` (past dates are negative). */
export function daysUntil(date: Date | null | undefined, now = new Date()): number | null {
  if (!date) return null;
  return Math.round((startOfDay(new Date(date)).getTime() - startOfDay(now).getTime()) / MS_PER_DAY);
}

/** Whole days a still-open item has been open. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

export function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** "2026-07" label from a date. */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Renewal / SSL status (domain, hosting, ssl all share this rule)
// ---------------------------------------------------------------------------
export function renewalStatus(
  renewalDate: Date | null | undefined,
  now = new Date(),
): { status: RenewalStatus; daysRemaining: number | null } {
  const daysRemaining = daysUntil(renewalDate, now);
  if (daysRemaining == null) return { status: "Not Tracked", daysRemaining: null };
  if (daysRemaining < 0) return { status: "Expired", daysRemaining };
  if (daysRemaining <= 30) return { status: "Due in 30 Days", daysRemaining };
  if (daysRemaining <= 60) return { status: "Due in 60 Days", daysRemaining };
  return { status: "OK", daysRemaining };
}

// ---------------------------------------------------------------------------
// Invoice math & status
// ---------------------------------------------------------------------------
export interface InvoiceCalcInput {
  amount: number; // charge before discount
  discount: number;
  chargeType: string;
  dueDate: Date;
  payments: { amount: number; paymentDate: Date }[];
}

export interface InvoiceCalc {
  amountDue: number;
  amountPaid: number;
  balance: number;
  lastPaymentDate: Date | null;
  status: InvoiceStatus;
  daysLate: number; // 0 unless overdue or paid late
}

export function invoiceCalc(inv: InvoiceCalcInput, now = new Date()): InvoiceCalc {
  const amountDue = money(inv.amount - inv.discount);
  const amountPaid = money(inv.payments.reduce((s, p) => s + toNum(p.amount), 0));
  const balance = money(amountDue - amountPaid);
  const lastPaymentDate =
    inv.payments.length === 0
      ? null
      : inv.payments.reduce(
          (latest, p) => (p.paymentDate > latest ? p.paymentDate : latest),
          inv.payments[0].paymentDate,
        );

  const today = startOfDay(now);
  const due = startOfDay(inv.dueDate);
  const overdue = today.getTime() > due.getTime();

  let status: InvoiceStatus;
  let daysLate = 0;

  if (amountDue <= 0) {
    status = "No Charge";
  } else if (balance <= 0) {
    // fully paid — on time or late?
    if (lastPaymentDate && startOfDay(lastPaymentDate).getTime() > due.getTime()) {
      status = "Paid Late";
      daysLate = daysBetween(due, lastPaymentDate);
    } else {
      status = "Paid On Time";
    }
  } else if (amountPaid > 0) {
    status = overdue ? "Partial – Overdue" : "Partially Paid";
    if (overdue) daysLate = daysBetween(due, today);
  } else {
    status = overdue ? "Overdue" : "Due";
    if (overdue) daysLate = daysBetween(due, today);
  }

  return { amountDue, amountPaid, balance, lastPaymentDate, status, daysLate };
}

/** Resolve an invoice due date from a manual override or the client billing day. */
export function resolveDueDate(
  billingMonth: Date,
  manualDueDate: Date | null | undefined,
  billingDay: number | null | undefined,
): Date {
  if (manualDueDate) return manualDueDate;
  const y = billingMonth.getFullYear();
  const m = billingMonth.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const day = Math.min(Math.max(billingDay ?? 1, 1), lastDay);
  return new Date(y, m, day);
}

// ---------------------------------------------------------------------------
// Support ticket deadline status
// ---------------------------------------------------------------------------
export function deadlineStatus(
  t: {
    status: string;
    requestedDate: Date;
    dueDate: Date | null | undefined;
    completedDate: Date | null | undefined;
  },
  now = new Date(),
): { deadlineStatus: DeadlineStatus; daysOpen: number } {
  const isDone = t.status === "Completed" || !!t.completedDate;
  const endRef = t.completedDate ?? now;
  const daysOpen = Math.max(0, daysBetween(new Date(t.requestedDate), endRef));

  if (!t.dueDate) return { deadlineStatus: "No Deadline", daysOpen };

  const due = startOfDay(new Date(t.dueDate));

  if (isDone) {
    const completed = startOfDay(t.completedDate ?? now);
    return {
      deadlineStatus: completed.getTime() > due.getTime() ? "Completed Late" : "Completed On Time",
      daysOpen,
    };
  }

  const remaining = daysUntil(due, now)!;
  if (remaining < 0) return { deadlineStatus: "Overdue", daysOpen };
  if (remaining <= 3) return { deadlineStatus: "Due Soon", daysOpen };
  return { deadlineStatus: "On Track", daysOpen };
}
