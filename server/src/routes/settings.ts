import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

// ---- full settings (option lists + config) --------------------------------
router.get("/", async (_req, res) => {
  const [options, config] = await Promise.all([
    prisma.optionList.findMany({ orderBy: [{ listKey: "asc" }, { order: "asc" }] }),
    prisma.config.findMany(),
  ]);
  const grouped: Record<string, { id: string; value: string; order: number; active: boolean }[]> = {};
  for (const o of options) (grouped[o.listKey] ??= []).push({ id: o.id, value: o.value, order: o.order, active: o.active });
  const cfg: Record<string, string> = {};
  for (const c of config) cfg[c.key] = c.value;
  res.json({ options: grouped, config: cfg });
});

// ---- add an option to a list ---------------------------------------------
const addSchema = z.object({ listKey: z.string().min(1), value: z.string().min(1) });
router.post("/options", async (req, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "listKey and value are required" });
  const { listKey, value } = parsed.data;
  const existing = await prisma.optionList.findUnique({ where: { listKey_value: { listKey, value } } });
  if (existing) {
    if (!existing.active) await prisma.optionList.update({ where: { id: existing.id }, data: { active: true } });
    return res.json({ ok: true, reactivated: !existing.active });
  }
  const max = await prisma.optionList.aggregate({ where: { listKey }, _max: { order: true } });
  const created = await prisma.optionList.create({ data: { listKey, value, order: (max._max.order ?? -1) + 1 } });
  await logActivity(req, "Setting", created.id, "create", `Added ${listKey} option "${value}"`);
  res.status(201).json({ option: { id: created.id, value: created.value, order: created.order, active: created.active } });
});

// ---- toggle / delete an option -------------------------------------------
router.delete("/options/:id", async (req, res) => {
  const opt = await prisma.optionList.findUnique({ where: { id: req.params.id } });
  if (!opt) return res.status(404).json({ error: "Option not found" });
  // Deactivate rather than hard-delete so historical records keep their value.
  await prisma.optionList.update({ where: { id: opt.id }, data: { active: false } });
  await logActivity(req, "Setting", opt.id, "delete", `Disabled ${opt.listKey} option "${opt.value}"`);
  res.json({ ok: true });
});

router.post("/options/:id/enable", async (req, res) => {
  const opt = await prisma.optionList.findUnique({ where: { id: req.params.id } });
  if (!opt) return res.status(404).json({ error: "Option not found" });
  await prisma.optionList.update({ where: { id: opt.id }, data: { active: true } });
  res.json({ ok: true });
});

// ---- update config --------------------------------------------------------
router.patch("/config", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const allowed = ["currency", "reminderWindowDays", "company", "defaultBillingDay", "salesSettings"];
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) continue;
    const value = typeof body[key] === "string" ? (body[key] as string) : JSON.stringify(body[key]);
    await prisma.config.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  await logActivity(req, "Setting", null, "update", "Updated company settings");
  const config = await prisma.config.findMany();
  const cfg: Record<string, string> = {};
  for (const c of config) cfg[c.key] = c.value;
  res.json({ config: cfg });
});

export default router;
