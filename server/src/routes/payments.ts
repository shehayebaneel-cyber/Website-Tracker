import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { paging } from "../lib/http.js";
import { nextPaymentCode } from "../lib/ids.js";
import { invoiceCalc, toNum, money } from "../lib/calc.js";
import { serializePayment } from "../lib/serialize.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const payInclude = {
  invoice: true,
  client: { select: { businessName: true, code: true } },
} satisfies Prisma.PaymentInclude;

function withClient(p: any) {
  return { ...serializePayment(p), clientName: p.client.businessName, clientCode: p.client.code };
}

// ---- List -----------------------------------------------------------------
router.get("/", async (req, res) => {
  const { page, pageSize, skip, take } = paging(req);
  const where: Prisma.PaymentWhereInput = { deletedAt: null };
  if (req.query.clientId) where.clientId = req.query.clientId as string;
  if (req.query.method && req.query.method !== "All") where.method = req.query.method as string;
  if (req.query.depositStatus && req.query.depositStatus !== "All") where.depositStatus = req.query.depositStatus as string;
  const q = (req.query.q as string | undefined)?.trim();
  if (q) where.OR = [
    { code: { contains: q, mode: "insensitive" } },
    { reference: { contains: q, mode: "insensitive" } },
    { client: { businessName: { contains: q, mode: "insensitive" } } },
  ];

  const [total, rows] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({ where, include: payInclude, orderBy: { paymentDate: "desc" }, skip, take }),
  ]);
  res.json({ items: rows.map(withClient), total, page, pageSize, pageCount: Math.ceil(total / pageSize) });
});

// ---- Create (record a payment) -------------------------------------------
const createSchema = z.object({
  paymentDate: z.coerce.date().optional(),
  invoiceId: z.string().optional().nullable(),
  clientId: z.string().optional(),
  amount: z.coerce.number().positive(),
  method: z.string().default("Cash"),
  reference: z.string().optional().nullable(),
  receivedBy: z.string().optional().nullable(),
  depositStatus: z.string().default("Not Deposited"),
  depositDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  allowOverpayment: z.boolean().optional(),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
  const b = parsed.data;

  let clientId = b.clientId;
  let invoice = null as null | Awaited<ReturnType<typeof prisma.invoice.findFirst>>;

  if (b.invoiceId) {
    invoice = await prisma.invoice.findFirst({
      where: { id: b.invoiceId, deletedAt: null },
      include: { payments: { where: { deletedAt: null } } },
    });
    if (!invoice) return res.status(400).json({ error: "Invoice not found" });
    // client is derived from the invoice — prevents client/invoice mismatch
    if (clientId && clientId !== invoice.clientId)
      return res.status(400).json({ error: "Payment client does not match the invoice's client" });
    clientId = invoice.clientId;

    // overpayment guard
    const calc = invoiceCalc({
      amount: toNum(invoice.amount), discount: toNum(invoice.discount), chargeType: invoice.chargeType,
      dueDate: invoice.dueDate, payments: (invoice as any).payments.map((p: any) => ({ amount: toNum(p.amount), paymentDate: p.paymentDate })),
    });
    if (b.amount > calc.balance && !b.allowOverpayment) {
      return res.status(409).json({
        error: "overpayment",
        message: `This payment (${money(b.amount)}) is more than the invoice balance (${money(calc.balance)}). Confirm to record it as an overpayment.`,
        balance: calc.balance,
      });
    }
  }

  if (!clientId) return res.status(400).json({ error: "Select an invoice or a client" });
  const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null } });
  if (!client) return res.status(400).json({ error: "Client not found" });

  const paymentDate = b.paymentDate ?? new Date();
  const created = await prisma.$transaction(async (tx) => {
    const code = await nextPaymentCode(tx, paymentDate);
    return tx.payment.create({
      data: {
        code,
        paymentDate,
        invoiceId: invoice?.id ?? null,
        clientId: client.id,
        amount: b.amount,
        method: b.method,
        reference: b.reference ?? null,
        receivedBy: b.receivedBy ?? null,
        depositStatus: b.depositStatus,
        depositDate: b.depositStatus === "Deposited" ? (b.depositDate ?? new Date()) : null,
        notes: b.notes ?? null,
      },
      include: payInclude,
    });
  });
  await logActivity(req, "Payment", created.id, "create", `Recorded ${money(b.amount)} from ${client.businessName}${invoice ? ` on ${invoice.code}` : ""}`);
  res.status(201).json({ payment: withClient(created) });
});

// ---- Update ---------------------------------------------------------------
const updateSchema = z.object({
  method: z.string().optional(),
  reference: z.string().optional().nullable(),
  receivedBy: z.string().optional().nullable(),
  depositStatus: z.string().optional(),
  depositDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
  const existing = await prisma.payment.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: "Payment not found" });
  const b = parsed.data;
  const data: Prisma.PaymentUpdateInput = { ...b } as any;
  if (b.depositStatus === "Deposited" && !existing.depositDate && !b.depositDate) data.depositDate = new Date();
  if (b.depositStatus && b.depositStatus !== "Deposited") data.depositDate = null;
  const updated = await prisma.payment.update({ where: { id: existing.id }, data, include: payInclude });
  await logActivity(req, "Payment", updated.id, "update", `Updated payment ${updated.code}`);
  res.json({ payment: withClient(updated) });
});

// ---- Soft delete ----------------------------------------------------------
router.delete("/:id", async (req, res) => {
  const existing = await prisma.payment.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: "Payment not found" });
  await prisma.payment.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
  await logActivity(req, "Payment", existing.id, "delete", `Removed payment ${existing.code}`);
  res.json({ ok: true });
});

export default router;
