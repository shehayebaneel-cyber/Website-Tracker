import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Structured, human-readable ID generators matching the Excel conventions.
// Each is computed from the current max sequence so IDs stay gap-tolerant and
// unique. Call inside a transaction (tx) when creating records concurrently.
// ---------------------------------------------------------------------------

type Tx = Prisma.TransactionClient;

function ym(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function ymd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/** Highest numeric suffix among codes matching `prefix`, or 0. */
function maxSuffix(rows: { code: string }[], stripPrefix: RegExp): number {
  let max = 0;
  for (const r of rows) {
    const m = r.code.replace(stripPrefix, "");
    const n = parseInt(m, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

/** C001, C002, ... */
export async function nextClientCode(tx: Tx): Promise<string> {
  const rows = await tx.client.findMany({ select: { code: true } });
  let max = 0;
  for (const r of rows) {
    const n = parseInt(r.code.replace(/^C/i, ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `C${pad(max + 1, 3)}`;
}

/** WEB-C001-01 (sequence per client). */
export async function nextWebsiteCode(tx: Tx, clientCode: string): Promise<string> {
  const prefix = `WEB-${clientCode}-`;
  const rows = await tx.website.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });
  const max = await maxSuffix(rows, new RegExp(`^${prefix}`));
  return `${prefix}${pad(max + 1, 2)}`;
}

/** INV-202607-C001-01 (sequence per client per billing month). */
export async function nextInvoiceCode(tx: Tx, clientCode: string, billingMonth: Date): Promise<string> {
  const prefix = `INV-${ym(billingMonth)}-${clientCode}-`;
  const rows = await tx.invoice.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });
  const max = await maxSuffix(rows, new RegExp(`^${prefix}`));
  return `${prefix}${pad(max + 1, 2)}`;
}

/** PAY-20260720-001 (sequence per calendar day). */
export async function nextPaymentCode(tx: Tx, paymentDate: Date): Promise<string> {
  const prefix = `PAY-${ymd(paymentDate)}-`;
  const rows = await tx.payment.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });
  const max = await maxSuffix(rows, new RegExp(`^${prefix}`));
  return `${prefix}${pad(max + 1, 3)}`;
}

/** EXP-202607-001 (sequence per month). */
export async function nextExpenseCode(tx: Tx, expenseDate: Date): Promise<string> {
  const prefix = `EXP-${ym(expenseDate)}-`;
  const rows = await tx.expense.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });
  const max = await maxSuffix(rows, new RegExp(`^${prefix}`));
  return `${prefix}${pad(max + 1, 3)}`;
}

/** TKT-202607-001 (sequence per month). */
export async function nextTicketCode(tx: Tx, requestedDate: Date): Promise<string> {
  const prefix = `TKT-${ym(requestedDate)}-`;
  const rows = await tx.supportTicket.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });
  const max = await maxSuffix(rows, new RegExp(`^${prefix}`));
  return `${prefix}${pad(max + 1, 3)}`;
}
