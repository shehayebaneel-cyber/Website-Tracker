import { Router } from "express";
import { prisma } from "../lib/db.js";
import { invoiceCalc, toNum, money, firstOfMonth } from "../lib/calc.js";

const router = Router();

type Cell = {
  status: string;
  invoiceId: string | null;
  amountDue: number;
  balance: number;
};

router.get("/", async (req, res) => {
  const now = new Date();
  const year = parseInt((req.query.year as string) || String(now.getFullYear()), 10);
  const yStart = new Date(year, 0, 1);
  const yEnd = new Date(year + 1, 0, 1);
  const currentMonthStart = firstOfMonth(now);

  const [clients, invoices] = await Promise.all([
    prisma.client.findMany({ where: { deletedAt: null }, orderBy: { code: "asc" } }),
    prisma.invoice.findMany({
      where: { deletedAt: null, chargeType: "Monthly Subscription", billingMonth: { gte: yStart, lt: yEnd } },
      include: { payments: { where: { deletedAt: null } } },
    }),
  ]);

  // index invoices by clientId -> monthIndex(0-11)
  const byClientMonth = new Map<string, Map<number, (typeof invoices)[number]>>();
  for (const inv of invoices) {
    const mi = inv.billingMonth.getMonth();
    if (!byClientMonth.has(inv.clientId)) byClientMonth.set(inv.clientId, new Map());
    byClientMonth.get(inv.clientId)!.set(mi, inv);
  }

  const payTotals = new Map<string, { paid: number; last: Date | null }>();

  const rows = clients.map((c) => {
    const subStart = c.subscriptionStartDate ? firstOfMonth(c.subscriptionStartDate) : null;
    const cancel = c.status === "Cancelled" && c.cancellationDate ? firstOfMonth(c.cancellationDate) : null;
    const months: Cell[] = [];
    let billed = 0, paid = 0, paidMonths = 0, unpaidMonths = 0;
    let lastPayment: Date | null = null;

    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(year, m, 1);
      const inv = byClientMonth.get(c.id)?.get(m) ?? null;

      let status: string;
      let cell: Cell = { status: "Not Billed", invoiceId: null, amountDue: 0, balance: 0 };

      if (inv) {
        const calc = invoiceCalc({
          amount: toNum(inv.amount), discount: toNum(inv.discount), chargeType: inv.chargeType,
          dueDate: inv.dueDate, payments: inv.payments.map((p) => ({ amount: toNum(p.amount), paymentDate: p.paymentDate })),
        }, now);
        billed += calc.amountDue;
        paid += calc.amountPaid;
        if (calc.lastPaymentDate && (!lastPayment || calc.lastPaymentDate > lastPayment)) lastPayment = calc.lastPaymentDate;

        if (calc.status === "Paid On Time" || calc.status === "Paid Late") { status = calc.status; paidMonths++; }
        else if (calc.status === "Partial – Overdue" || calc.status === "Overdue") { status = "Overdue"; unpaidMonths++; }
        else if (calc.status === "Partially Paid") { status = "Partially Paid"; unpaidMonths++; }
        else { status = "Due"; unpaidMonths++; }
        cell = { status, invoiceId: inv.id, amountDue: calc.amountDue, balance: calc.balance };
      } else {
        if (cancel && monthStart >= cancel) status = "Cancelled";
        else if (subStart && monthStart < subStart) status = "Not Started";
        else if (monthStart > currentMonthStart) status = "Future";
        else status = "Not Billed";
        cell = { status, invoiceId: null, amountDue: 0, balance: 0 };
      }
      months.push(cell);
    }

    payTotals.set(c.id, { paid, last: lastPayment });
    return {
      clientId: c.id,
      code: c.code,
      businessName: c.businessName,
      status: c.status,
      months,
      billed: money(billed),
      paid: money(paid),
      balance: money(billed - paid),
      lastPaymentDate: lastPayment,
      paidMonths,
      unpaidMonths,
    };
  });

  res.json({ year, rows });
});

export default router;
