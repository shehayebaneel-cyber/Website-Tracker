// ---------------------------------------------------------------------------
// Website configurations submitted from the public builder.
//
// A configuration always reaches us, even when there is no salesperson to make
// a lead from — so this is where it is read. Everything shown comes from the
// snapshot stored at submission, never from today's catalogue: a price change
// must never rewrite what a customer was actually shown.
// ---------------------------------------------------------------------------

import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

export const CONFIG_STATUSES = ["New", "Contacted", "Quoted", "Converted", "Closed"] as const;

const money = (d: unknown) => (d == null ? 0 : Number(d));

/**
 * PlanConfiguration stores a salesperson and lead id but declares no Prisma
 * relation to them, so the names are resolved in one extra query rather than
 * with an include.
 */
async function withNames(rows: any[]) {
  const salespersonIds = [...new Set(rows.map((r) => r.salespersonId).filter(Boolean))];
  const leadIds = [...new Set(rows.map((r) => r.leadId).filter(Boolean))];

  const [people, leads] = await Promise.all([
    salespersonIds.length
      ? prisma.salesperson.findMany({ where: { id: { in: salespersonIds } }, select: { id: true, fullName: true } })
      : [],
    leadIds.length
      ? prisma.lead.findMany({ where: { id: { in: leadIds } }, select: { id: true, code: true } })
      : [],
  ]);

  const personById = new Map(people.map((p) => [p.id, p.fullName]));
  const leadById = new Map(leads.map((l) => [l.id, l.code]));

  return rows.map((r) => ({
    ...r,
    salesperson: r.salespersonId ? { fullName: personById.get(r.salespersonId) ?? null } : null,
    lead: r.leadId ? { id: r.leadId, code: leadById.get(r.leadId) ?? null } : null,
  }));
}

function serialize(c: any) {
  const breakdown = (c.breakdown ?? {}) as any;
  return {
    id: c.id,
    code: c.code,
    status: c.status,
    createdAt: c.createdAt,

    contactName: c.contactName,
    businessName: c.businessName,
    phone: c.phone,
    email: c.email,
    businessType: c.businessType,
    notes: c.notes,

    systemKeys: c.systemKeys ?? [],
    packKeys: c.packKeys ?? [],
    oneTimeKeys: c.oneTimeKeys ?? [],
    externalKeys: c.externalKeys ?? [],

    monthlyTotal: money(c.monthlyTotal),
    oneTimeTotal: money(c.oneTimeTotal),

    // The snapshot: the lines, limits and quotation items as shown.
    lines: (c.selectedAddOns ?? []) as any[],
    quoteItems: (c.quoteItems ?? []) as any[],
    limits: breakdown.limits ?? [],
    oneTime: breakdown.oneTime ?? [],
    external: breakdown.external ?? [],

    // Configurations submitted under the old plan model keep their own fields.
    legacyPlanKey: c.planKey ?? null,
    legacyCoreSystem: c.coreSystem ?? null,

    salespersonName: c.salesperson?.fullName ?? null,
    leadId: c.lead?.id ?? null,
    leadCode: c.lead?.code ?? null,
  };
}

router.get("/", async (req, res) => {
  const where: Prisma.PlanConfigurationWhereInput = { archived: false };
  if (req.query.status && req.query.status !== "All") where.status = req.query.status as string;

  const q = (req.query.q as string | undefined)?.trim();
  if (q) {
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { businessName: { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.planConfiguration.findMany({ where, orderBy: { createdAt: "desc" } });
  res.json({ items: (await withNames(rows)).map(serialize) });
});

router.get("/:id", async (req, res) => {
  const c = await prisma.planConfiguration.findUnique({ where: { id: req.params.id } });
  if (!c) return res.status(404).json({ error: "Configuration not found" });
  res.json({ configuration: serialize((await withNames([c]))[0]) });
});

const patchSchema = z.object({
  status: z.enum(CONFIG_STATUSES).optional(),
  notes: z.string().max(4000).optional(),
  archived: z.boolean().optional(),
});

router.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid update" });

  const c = await prisma.planConfiguration.update({ where: { id: req.params.id }, data: parsed.data });
  await logActivity(
    req, "PlanConfiguration", c.id, "update",
    `Website request ${c.code}${parsed.data.status ? ` → ${parsed.data.status}` : ""}`
  );
  res.json({ configuration: serialize((await withNames([c]))[0]) });
});

export default router;
