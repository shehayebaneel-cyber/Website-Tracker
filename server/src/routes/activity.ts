import { Router } from "express";
import { prisma } from "../lib/db.js";
import { paging } from "../lib/http.js";

const router = Router();

router.get("/", async (req, res) => {
  const { page, pageSize, skip, take } = paging(req);
  const where: any = {};
  if (req.query.entityType && req.query.entityType !== "All") where.entityType = req.query.entityType as string;
  const [total, rows] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({ where, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, skip, take }),
  ]);
  res.json({
    items: rows.map((r) => ({ id: r.id, entityType: r.entityType, entityId: r.entityId, action: r.action, summary: r.summary, user: r.user?.name ?? "System", createdAt: r.createdAt })),
    total, page, pageSize, pageCount: Math.ceil(total / pageSize),
  });
});

export default router;
