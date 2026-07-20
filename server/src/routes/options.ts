// Configurable dropdown option lists (Settings). Read endpoint for now; the
// Settings management UI (edit/add/reorder) lands in a later phase.
import { Router } from "express";
import { prisma } from "../lib/db.js";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await prisma.optionList.findMany({
    where: { active: true },
    orderBy: [{ listKey: "asc" }, { order: "asc" }],
  });
  const grouped: Record<string, string[]> = {};
  for (const r of rows) {
    (grouped[r.listKey] ??= []).push(r.value);
  }
  res.json({ options: grouped });
});

export default router;
