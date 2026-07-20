import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { hashPassword } from "../lib/auth.js";
import { requireSalesAdmin, nextSalespersonCode } from "../lib/sales.js";
import { invoiceCalc, toNum, money, firstOfMonth, monthKey } from "../lib/calc.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

// ---- derived summary for a salesperson ------------------------------------
async function summarize(spId: string) {
  const now = new Date();
  const curKey = monthKey(firstOfMonth(now));
  const [leads, assignments, sp] = await Promise.all([
    prisma.lead.findMany({ where: { salespersonId: spId, deletedAt: null }, select: { status: true } }),
    prisma.clientAssignment.findMany({
      where: { currentSalespersonId: spId, status: "Active" },
      include: {
        client: { include: { invoices: { where: { deletedAt: null, chargeType: "Monthly Subscription" }, include: { payments: { where: { deletedAt: null } } } } } },
        website: { select: { status: true } },
      },
    }),
    prisma.salesperson.findUnique({ where: { id: spId } }),
  ]);
  const broughtCount = await prisma.clientAssignment.findMany({ where: { originalSalespersonId: spId }, select: { clientId: true } });

  const activeLeadStatuses = new Set(["New", "Contacted", "Interested", "Meeting Scheduled", "Proposal Sent", "Negotiating", "Waiting for Client", "Follow Up Later"]);
  const totalLeads = leads.length;
  const activeLeads = leads.filter((l) => activeLeadStatuses.has(l.status)).length;
  const leadsWon = leads.filter((l) => l.status === "Won").length;

  const clientIds = new Set(assignments.map((a) => a.clientId));
  let payingWebsites = 0;
  let unpaidClients = 0;
  for (const a of assignments) {
    const curInv = a.client.invoices.find((i) => monthKey(i.billingMonth) === curKey);
    if (!curInv) { unpaidClients++; continue; }
    const calc = invoiceCalc({ amount: toNum(curInv.amount), discount: toNum(curInv.discount), chargeType: curInv.chargeType, dueDate: curInv.dueDate, payments: curInv.payments.map((p) => ({ amount: toNum(p.amount), paymentDate: p.paymentDate })) }, now);
    if (calc.balance <= 0 && (a.website?.status ?? "Live") !== "Cancelled") payingWebsites++;
    else if (calc.balance > 0) unpaidClients++;
  }

  const commAmount = sp ? toNum(sp.commissionAmount) : 5;
  const broughtClientIds = new Set(broughtCount.map((b) => b.clientId));
  const retention = broughtClientIds.size > 0 ? Math.round((clientIds.size / broughtClientIds.size) * 100) : null;

  return {
    totalLeads, activeLeads, leadsWon,
    totalClientsBrought: broughtClientIds.size,
    currentAssignedClients: clientIds.size,
    activePayingWebsites: payingWebsites,
    unpaidClients,
    followUpsDue: 0, followUpsOverdue: 0, // Phase 2
    estimatedMonthlyCommission: money(payingWebsites * commAmount),
    commissionApproved: 0, commissionPaid: 0, commissionOnHold: 0, lifetimeCommissionPaid: 0, // Phase 2
    retentionRate: retention,
  };
}

function serialize(sp: any) {
  return {
    id: sp.id, code: sp.code, userId: sp.userId, fullName: sp.fullName, photoUrl: sp.photoUrl,
    phone: sp.phone, email: sp.email, city: sp.city, startDate: sp.startDate, endDate: sp.endDate,
    status: sp.status, commissionMethod: sp.commissionMethod, commissionAmount: toNum(sp.commissionAmount),
    commissionPercent: toNum(sp.commissionPercent), paymentMethod: sp.paymentMethod, whishNumber: sp.whishNumber,
    bankInfo: sp.bankInfo, agreementUrl: sp.agreementUrl, agreementSignedDate: sp.agreementSignedDate,
    departureReason: sp.departureReason, notes: sp.notes, hasLogin: !!sp.userId,
  };
}

// ---- current salesperson's own profile (portal) ---------------------------
router.get("/me", async (req, res) => {
  if (!req.salespersonId) return res.status(404).json({ error: "No salesperson profile" });
  const sp = await prisma.salesperson.findUnique({ where: { id: req.salespersonId } });
  res.json({ salesperson: serialize(sp), summary: await summarize(req.salespersonId) });
});

// ---- list (admin) ---------------------------------------------------------
router.get("/", requireSalesAdmin, async (req, res) => {
  const where: Prisma.SalespersonWhereInput = { deletedAt: null };
  if (req.query.status && req.query.status !== "All") where.status = req.query.status as string;
  const q = (req.query.q as string | undefined)?.trim();
  if (q) where.OR = [{ fullName: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }];

  const rows = await prisma.salesperson.findMany({ where, orderBy: { code: "asc" } });
  const items = await Promise.all(rows.map(async (sp) => ({ ...serialize(sp), summary: await summarize(sp.id) })));
  res.json({ items });
});

// ---- one (admin, or the salesperson themselves) ---------------------------
router.get("/:id", async (req, res) => {
  if (!req.isSalesAdmin && req.salespersonId !== req.params.id) return res.status(403).json({ error: "Forbidden" });
  const sp = await prisma.salesperson.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!sp) return res.status(404).json({ error: "Salesperson not found" });
  res.json({ salesperson: serialize(sp), summary: await summarize(sp.id) });
});

// ---- create (admin) — optionally with a login account ---------------------
const createSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  status: z.string().optional(),
  commissionMethod: z.enum(["Fixed", "Percentage"]).optional(),
  commissionAmount: z.coerce.number().min(0).optional(),
  commissionPercent: z.coerce.number().min(0).max(100).optional(),
  paymentMethod: z.string().optional().nullable(),
  whishNumber: z.string().optional().nullable(),
  bankInfo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // optional login
  loginEmail: z.string().email().optional(),
  loginPassword: z.string().min(8).optional(),
});

router.post("/", requireSalesAdmin, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data" });
  const b = parsed.data;

  let userId: string | null = null;
  if (b.loginEmail && b.loginPassword) {
    const email = b.loginEmail.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) return res.status(409).json({ error: "A user with that login email already exists" });
    const user = await prisma.user.create({ data: { email, name: b.fullName, role: "SALESPERSON", passwordHash: await hashPassword(b.loginPassword) } });
    userId = user.id;
  }

  const created = await prisma.$transaction(async (tx) => {
    const code = await nextSalespersonCode(tx);
    return tx.salesperson.create({
      data: {
        code, userId, fullName: b.fullName, phone: b.phone ?? null, email: b.email ?? b.loginEmail ?? null,
        city: b.city ?? null, startDate: b.startDate ?? null, status: b.status ?? "Active",
        commissionMethod: b.commissionMethod ?? "Fixed", commissionAmount: b.commissionAmount ?? 5,
        commissionPercent: b.commissionPercent ?? 25, paymentMethod: b.paymentMethod ?? null,
        whishNumber: b.whishNumber ?? null, bankInfo: b.bankInfo ?? null, notes: b.notes ?? null,
      },
    });
  });
  await logActivity(req, "Salesperson", created.id, "create", `Added salesperson ${created.code} — ${created.fullName}`);
  res.status(201).json({ salesperson: serialize(created) });
});

// ---- update (admin) -------------------------------------------------------
router.patch("/:id", requireSalesAdmin, async (req, res) => {
  const parsed = createSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data" });
  const existing = await prisma.salesperson.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: "Salesperson not found" });
  const b: any = parsed.data;
  const data: any = {};
  for (const k of ["fullName", "phone", "email", "city", "startDate", "status", "commissionMethod", "commissionAmount", "commissionPercent", "paymentMethod", "whishNumber", "bankInfo", "notes"]) {
    if (b[k] !== undefined) data[k] = b[k] === "" ? null : b[k];
  }
  const updated = await prisma.salesperson.update({ where: { id: existing.id }, data });
  await logActivity(req, "Salesperson", updated.id, "update", `Updated salesperson ${updated.code}`);
  res.json({ salesperson: serialize(updated) });
});

// ---- deactivate (admin) ---------------------------------------------------
router.post("/:id/deactivate", requireSalesAdmin, async (req, res) => {
  const existing = await prisma.salesperson.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: "Salesperson not found" });
  const status = (req.body?.status as string) || "Left Company";
  const updated = await prisma.salesperson.update({ where: { id: existing.id }, data: { status, endDate: new Date(), departureReason: req.body?.reason ?? null } });
  // Remove portal access
  if (existing.userId) await prisma.user.update({ where: { id: existing.userId }, data: { active: false } });
  await logActivity(req, "Salesperson", updated.id, "deactivate", `Deactivated salesperson ${updated.code} (${status})`);
  res.json({ salesperson: serialize(updated) });
});

export default router;
