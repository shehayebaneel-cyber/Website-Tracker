import type { Request } from "express";
import { prisma } from "./db.js";

// Fire-and-forget audit trail. Never blocks or fails the request.
export async function logActivity(
  req: Request,
  entityType: string,
  entityId: string | null,
  action: string,
  summary: string,
  meta?: unknown,
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: req.user?.uid ?? null,
        entityType,
        entityId,
        action,
        summary,
        meta: meta === undefined ? undefined : (meta as any),
      },
    });
  } catch {
    // Auditing must never break the primary operation.
  }
}
