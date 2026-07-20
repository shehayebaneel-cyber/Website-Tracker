import type { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// Role-based access. Sections map 1:1 to API areas / nav items.
//  - OWNER       : everything (admin)
//  - STAFF       : main operations + finance, no user/settings admin
//  - DEVELOPER   : technical only (websites, support, renewals)
//  - MANAGER     : sales oversight (view team/leads/follow-ups/reports)
//  - SALESPERSON : own sales data only (row-level scoped in the routes)
// ---------------------------------------------------------------------------
export type Section =
  // main app
  | "dashboard" | "clients" | "websites" | "billing" | "payments" | "expenses"
  | "support" | "monthly" | "alerts" | "reports" | "activity" | "settings" | "users"
  // sales module
  | "salesDashboard" | "salesTeam" | "leads" | "salesClients" | "followUps"
  | "commissions" | "payouts" | "salesReports" | "salesSettings" | "applications";

const MATRIX: Record<string, Section[] | "*"> = {
  OWNER: "*",
  STAFF: ["dashboard", "clients", "websites", "billing", "payments", "expenses", "support", "monthly", "alerts", "reports", "activity"],
  DEVELOPER: ["websites", "support", "alerts"],
  MANAGER: ["salesDashboard", "salesTeam", "leads", "followUps", "salesReports", "applications"],
  SALESPERSON: ["salesDashboard", "leads", "salesClients", "followUps", "commissions", "payouts"],
};

export function canAccess(role: string | undefined, section: Section): boolean {
  if (!role) return false;
  const allowed = MATRIX[role];
  if (!allowed) return false;
  return allowed === "*" || allowed.includes(section);
}

export function sectionsFor(role: string | undefined): Section[] | "*" {
  return (role && MATRIX[role]) || [];
}

/** Express middleware: gate a whole router to a section. */
export function requireSection(section: Section) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (canAccess(req.user?.role, section)) return next();
    return res.status(403).json({ error: "You don't have access to this area" });
  };
}

export const isSalesAdmin = (role?: string) => role === "OWNER" || role === "MANAGER";
