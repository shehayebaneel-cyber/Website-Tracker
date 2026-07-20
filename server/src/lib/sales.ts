import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "./db.js";
import { isSalesAdmin } from "./perms.js";

// Row-level scoping for the sales module. A SALESPERSON only ever sees their own
// leads/clients/commissions; OWNER/MANAGER see everyone. We resolve the caller's
// Salesperson record (by linked userId) and stash it on the request.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      salespersonId?: string; // set for SALESPERSON callers
      isSalesAdmin?: boolean;
    }
  }
}

const SALES_ROLES = ["OWNER", "MANAGER", "SALESPERSON"];

export async function attachSalesContext(req: Request, res: Response, next: NextFunction) {
  const role = req.user?.role;
  if (!role || !SALES_ROLES.includes(role)) {
    return res.status(403).json({ error: "You don't have access to Sales Management" });
  }
  req.isSalesAdmin = isSalesAdmin(role);
  if (role === "SALESPERSON") {
    const sp = await prisma.salesperson.findUnique({ where: { userId: req.user!.uid } });
    if (!sp) return res.status(403).json({ error: "No salesperson profile linked to this account" });
    req.salespersonId = sp.id;
  }
  next();
}

/** Guard for admin-only sales actions (create/edit/reassign/approve). */
export function requireSalesAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isSalesAdmin) return res.status(403).json({ error: "Only an owner or manager can do this" });
  next();
}

/** A where-filter that limits rows to the caller's salesperson (no-op for admins). */
export function scopeToSalesperson(req: Request): Prisma.LeadWhereInput {
  return req.salespersonId ? { salespersonId: req.salespersonId } : {};
}

// ---- ID generators --------------------------------------------------------
type Tx = Prisma.TransactionClient;
function ym(d: Date) { return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`; }
function pad(n: number, w: number) { return String(n).padStart(w, "0"); }

export async function nextSalespersonCode(tx: Tx): Promise<string> {
  const rows = await tx.salesperson.findMany({ select: { code: true } });
  let max = 0;
  for (const r of rows) { const n = parseInt(r.code.replace(/^SP/i, ""), 10); if (n > max) max = n; }
  return `SP${pad(max + 1, 3)}`;
}

export async function nextLeadCode(tx: Tx, date: Date): Promise<string> {
  const prefix = `LEAD-${ym(date)}-`;
  const rows = await tx.lead.findMany({ where: { code: { startsWith: prefix } }, select: { code: true } });
  let max = 0;
  for (const r of rows) { const n = parseInt(r.code.replace(prefix, ""), 10); if (n > max) max = n; }
  return `${prefix}${pad(max + 1, 3)}`;
}

export async function nextAssignmentCode(tx: Tx): Promise<string> {
  const rows = await tx.clientAssignment.findMany({ select: { code: true } });
  let max = 0;
  for (const r of rows) { const n = parseInt(r.code.replace(/^ASG-/i, ""), 10); if (n > max) max = n; }
  return `ASG-${pad(max + 1, 5)}`;
}

export async function nextApplicationCode(tx: Tx, date: Date): Promise<string> {
  const prefix = `APP-${ym(date)}-`;
  const rows = await tx.application.findMany({ where: { code: { startsWith: prefix } }, select: { code: true } });
  let max = 0;
  for (const r of rows) { const n = parseInt(r.code.replace(prefix, ""), 10); if (n > max) max = n; }
  return `${prefix}${pad(max + 1, 3)}`;
}

/** SUP-202607-001 for support requests submitted from the website. */
export async function nextSupportCode(tx: Tx, date: Date): Promise<string> {
  const prefix = `SUP-${ym(date)}-`;
  const rows = await tx.supportTicket.findMany({ where: { code: { startsWith: prefix } }, select: { code: true } });
  let max = 0;
  for (const r of rows) { const n = parseInt(r.code.replace(prefix, ""), 10); if (n > max) max = n; }
  return `${prefix}${pad(max + 1, 3)}`;
}

// Internal ticket status -> customer-friendly label (§10).
export function friendlyStatus(status: string): string {
  const map: Record<string, string> = {
    "Not Started": "Received",
    "In Progress": "In Progress",
    "Waiting for Client": "Waiting for Your Reply",
    "Waiting for Payment": "Waiting for Approval",
    "Completed": "Completed",
    "Cancelled": "Closed",
  };
  return map[status] ?? "Being Reviewed";
}
