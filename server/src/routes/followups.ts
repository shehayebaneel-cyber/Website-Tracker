import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { parseMonthKey } from "../lib/http.js";
import { firstOfMonth, monthKey, startOfDay } from "../lib/calc.js";
import { getSalesSettings, generateCommissions } from "../lib/commissions.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const AT_RISK_SAT = new Set(["Unsatisfied", "At Risk", "No Response"]);

function serialize(f: any) {
  return {
    id: f.id, clientId: f.clientId, salespersonId: f.salespersonId,
    month: monthKey(f.month), contactedDate: f.contactedDate, method: f.method,
    satisfaction: f.satisfaction, needsUpdate: f.needsUpdate, hasTechnicalIssue: f.hasTechnicalIssue,
    mayCancel: f.mayCancel, upsellOpportunity: f.upsellOpportunity, upsellNote: f.upsellNote,
    notes: f.notes, status: f.status, createdBy: f.createdBy, createdAt: f.createdAt,
  };
}

// ---- List assigned clients with their follow-up status for a month --------
router.get("/", async (req, res) => {
  const bm = parseMonthKey(req.query.month) ?? firstOfMonth(new Date());
  const settings = await getSalesSettings();
  const now = new Date();
  const curMonthStart = firstOfMonth(now);

  const assignments = await prisma.clientAssignment.findMany({
    where: {
      status: "Active",
      ...(req.salespersonId ? { currentSalespersonId: req.salespersonId } : (req.query.salespersonId ? { currentSalespersonId: req.query.salespersonId as string } : {})),
    },
    include: {
      client: { select: { id: true, code: true, businessName: true, phone: true, status: true } },
      currentSalesperson: { select: { id: true, fullName: true } },
    },
    orderBy: { client: { code: "asc" } },
  });

  const followUps = await prisma.monthlyFollowUp.findMany({ where: { month: bm } });
  const fuByClient = new Map(followUps.map((f) => [f.clientId, f]));

  // Due status for a client this month.
  function dueStatus(hasFu: boolean): string {
    if (hasFu) return "Completed";
    if (bm > curMonthStart) return "Not Due";
    if (bm < curMonthStart) return "Overdue"; // a past month with no follow-up
    return now.getDate() > settings.followUpDueDay ? "Overdue" : "Due";
  }

  const rows = assignments
    .filter((a) => a.client.status !== "Cancelled")
    .map((a) => {
      const f = fuByClient.get(a.clientId);
      const atRisk = !!f && (f.mayCancel || (f.satisfaction != null && AT_RISK_SAT.has(f.satisfaction)));
      return {
        clientId: a.clientId, clientCode: a.client.code, businessName: a.client.businessName, phone: a.client.phone,
        salespersonId: a.currentSalespersonId, salespersonName: a.currentSalesperson.fullName,
        month: monthKey(bm),
        followUp: f ? serialize(f) : null,
        dueStatus: dueStatus(!!f),
        atRisk,
      };
    });

  const summary = {
    total: rows.length,
    done: rows.filter((r) => r.dueStatus === "Completed").length,
    due: rows.filter((r) => r.dueStatus === "Due").length,
    overdue: rows.filter((r) => r.dueStatus === "Overdue").length,
    atRisk: rows.filter((r) => r.atRisk).length,
  };
  res.json({ month: monthKey(bm), rows, summary });
});

// ---- Log (upsert) a monthly follow-up -------------------------------------
const upsert = z.object({
  clientId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  contactedDate: z.coerce.date().optional().nullable(),
  method: z.string().optional().nullable(),
  satisfaction: z.string().optional().nullable(),
  needsUpdate: z.coerce.boolean().optional(),
  hasTechnicalIssue: z.coerce.boolean().optional(),
  mayCancel: z.coerce.boolean().optional(),
  upsellOpportunity: z.coerce.boolean().optional(),
  upsellNote: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
});

router.post("/", async (req, res) => {
  const parsed = upsert.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data" });
  const b = parsed.data;
  const bm = parseMonthKey(b.month)!;

  // Which salesperson owns this client right now?
  const asg = await prisma.clientAssignment.findFirst({
    where: { clientId: b.clientId, status: "Active" },
    include: { client: { select: { businessName: true } } },
  });
  if (!asg) return res.status(400).json({ error: "This client is not actively assigned to a salesperson." });
  // A salesperson can only log follow-ups for their own clients.
  if (req.salespersonId && asg.currentSalespersonId !== req.salespersonId) {
    return res.status(403).json({ error: "This client is not assigned to you." });
  }

  const data = {
    salespersonId: asg.currentSalespersonId,
    contactedDate: b.contactedDate ?? new Date(),
    method: b.method ?? null, satisfaction: b.satisfaction ?? null,
    needsUpdate: b.needsUpdate ?? false, hasTechnicalIssue: b.hasTechnicalIssue ?? false,
    mayCancel: b.mayCancel ?? false, upsellOpportunity: b.upsellOpportunity ?? false,
    upsellNote: b.upsellNote ?? null, notes: b.notes ?? null,
    status: b.status ?? "Completed", createdBy: req.user?.email ?? null,
  };

  const fu = await prisma.monthlyFollowUp.upsert({
    where: { clientId_month: { clientId: b.clientId, month: bm } },
    update: data,
    create: { clientId: b.clientId, month: bm, ...data },
  });

  // Logging a follow-up can move that client's commissions Under Review -> Eligible.
  await generateCommissions(bm, { salespersonId: asg.currentSalespersonId });

  await logActivity(req, "MonthlyFollowUp", fu.id, "create", `Logged ${monthKey(bm)} follow-up for ${asg.client.businessName}`);
  res.status(201).json({ followUp: serialize(fu) });
});

export default router;
