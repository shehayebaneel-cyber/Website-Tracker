// ---------------------------------------------------------------------------
// Commission engine. A salesperson earns a fixed $5 (or a %) per active website
// per month, credited to whoever currently manages the client, and only when
// that website's own subscription invoice is paid. The monthly "Generate &
// review" run below is idempotent: it (re)derives each row's status from the
// payment + follow-up + salesperson state, but NEVER downgrades a row an owner
// has already Approved / included in a Payout / Paid (or explicitly Held).
// ---------------------------------------------------------------------------
import type { Prisma } from "@prisma/client";
import { prisma } from "./db.js";
import { invoiceCalc, toNum, money, firstOfMonth } from "./calc.js";
import { nextCommissionCode } from "./sales.js";

// Statuses the generator will not touch (owner decisions / terminal states).
const LOCKED = new Set(["Approved", "Included in Payout", "Paid", "Held", "Reversed", "Cancelled"]);

export interface SalesSettings {
  defaultSubscription: number;
  defaultCommission: number;
  commissionMethod: string;
  commissionPercent: number;
  commissionBasis: string; // "Collected" | "Billed"
  commissionStopsOnLeave: boolean;
  followUpRequired: boolean;
  adminApprovalRequired: boolean;
  followUpDueDay: number;
}

const SETTINGS_DEFAULTS: SalesSettings = {
  defaultSubscription: 20, defaultCommission: 5, commissionMethod: "Fixed",
  commissionPercent: 25, commissionBasis: "Collected", commissionStopsOnLeave: true,
  followUpRequired: true, adminApprovalRequired: true, followUpDueDay: 5,
};

export async function getSalesSettings(): Promise<SalesSettings> {
  const row = await prisma.config.findUnique({ where: { key: "salesSettings" } });
  if (!row) return SETTINGS_DEFAULTS;
  try {
    return { ...SETTINGS_DEFAULTS, ...(JSON.parse(row.value) as Partial<SalesSettings>) };
  } catch {
    return SETTINGS_DEFAULTS;
  }
}

// Per-client commission plan: the assignment override wins, else the salesperson default.
function resolvePlan(
  a: { commissionMethod: string | null; commissionAmount: Prisma.Decimal | null; commissionPercent: Prisma.Decimal | null },
  sp: { commissionMethod: string; commissionAmount: Prisma.Decimal; commissionPercent: Prisma.Decimal },
) {
  return {
    method: a.commissionMethod ?? sp.commissionMethod,
    amount: a.commissionAmount != null ? toNum(a.commissionAmount) : toNum(sp.commissionAmount),
    percent: a.commissionPercent != null ? toNum(a.commissionPercent) : toNum(sp.commissionPercent),
  };
}

export interface GenerateResult {
  websiteId: string;
  code: string;
  status: string;
  kept?: boolean;
}

/**
 * (Re)generate commission rows for a billing month. Idempotent — safe to run
 * repeatedly. Returns one entry per active website of every active assignment.
 */
export async function generateCommissions(month: Date, opts?: { salespersonId?: string }): Promise<GenerateResult[]> {
  const bm = firstOfMonth(month);
  const settings = await getSalesSettings();
  const now = new Date();

  const assignments = await prisma.clientAssignment.findMany({
    where: {
      status: "Active",
      effectiveBillingMonth: { lte: bm },
      ...(opts?.salespersonId ? { currentSalespersonId: opts.salespersonId } : {}),
    },
    include: {
      client: { include: { websites: { where: { deletedAt: null, subscriptionActive: true } } } },
      currentSalesperson: true,
    },
  });

  const results: GenerateResult[] = [];

  for (const asg of assignments) {
    const sp = asg.currentSalesperson;
    if (asg.client.deletedAt || asg.client.status === "Cancelled") continue;
    const plan = resolvePlan(asg, sp);

    // Salesperson left, with a cutoff before this month? → not eligible.
    const cutoff = sp.finalEligibleCommissionMonth ? firstOfMonth(sp.finalEligibleCommissionMonth) : null;
    const pastCutoff = settings.commissionStopsOnLeave && cutoff != null && bm > cutoff;

    // A logged follow-up for this client+month is what unlocks "Eligible".
    const followUp = await prisma.monthlyFollowUp.findUnique({
      where: { clientId_month: { clientId: asg.clientId, month: bm } },
    });

    for (const w of asg.client.websites) {
      const fee = toNum(w.monthlyFee);
      if (fee <= 0) continue; // free websites earn no commission

      const invoice = await prisma.invoice.findFirst({
        where: { websiteId: w.id, chargeType: "Monthly Subscription", billingMonth: bm, deletedAt: null },
        include: { payments: { where: { deletedAt: null } } },
      });
      const calc = invoice
        ? invoiceCalc({
            amount: toNum(invoice.amount), discount: toNum(invoice.discount), chargeType: invoice.chargeType,
            dueDate: invoice.dueDate, payments: invoice.payments.map((p) => ({ amount: toNum(p.amount), paymentDate: p.paymentDate })),
          }, now)
        : null;
      const paid = calc ? calc.balance <= 0 && calc.amountPaid > 0 : false;
      const collected = calc ? calc.amountPaid : 0;
      const subscriptionAmount = calc ? calc.amountDue : fee;

      const amount = plan.method === "Percentage"
        ? money(((settings.commissionBasis === "Collected" ? collected : subscriptionAmount) * plan.percent) / 100)
        : money(plan.amount);

      let status = "Expected";
      let reason: string | null = null;
      if (pastCutoff) { status = "Cancelled"; reason = `${sp.fullName} is no longer eligible for commission this month`; }
      else if (!invoice) { status = "Expected"; reason = "Subscription not billed yet"; }
      else if (!paid) { status = "Waiting for Client Payment"; reason = null; }
      else if (settings.followUpRequired && !followUp) { status = "Under Review"; reason = "Monthly follow-up not logged"; }
      else { status = "Eligible"; reason = null; }

      const existing = await prisma.commission.findUnique({
        where: { websiteId_billingMonth: { websiteId: w.id, billingMonth: bm } },
      });
      if (existing && LOCKED.has(existing.status)) {
        results.push({ websiteId: w.id, code: existing.code, status: existing.status, kept: true });
        continue;
      }

      const data = {
        clientId: asg.clientId, salespersonId: sp.id, assignmentId: asg.id,
        subscriptionInvoiceId: invoice?.id ?? null, basis: settings.commissionBasis, method: plan.method,
        subscriptionAmount, amount, status, statusReason: reason, followUpId: followUp?.id ?? null,
      };

      let row;
      if (existing) {
        row = await prisma.commission.update({ where: { id: existing.id }, data });
      } else {
        row = await prisma.$transaction(async (tx) => {
          const code = await nextCommissionCode(tx, bm);
          return tx.commission.create({ data: { code, websiteId: w.id, billingMonth: bm, ...data } });
        });
      }
      results.push({ websiteId: w.id, code: row.code, status: row.status });
    }
  }

  return results;
}
