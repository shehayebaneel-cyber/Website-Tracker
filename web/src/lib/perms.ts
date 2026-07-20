export type Section =
  | "dashboard" | "clients" | "websites" | "billing" | "payments" | "expenses"
  | "support" | "monthly" | "alerts" | "reports" | "activity" | "settings" | "users"
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

/** Is this a sales-only role (no access to the main app)? */
export function isSalesOnly(role: string | undefined): boolean {
  return role === "SALESPERSON" || role === "MANAGER";
}

/** First section a role can land on (used for redirects). */
export function homeFor(role: string | undefined): string {
  if (canAccess(role, "dashboard")) return "/";
  if (canAccess(role, "salesDashboard")) return "/sales";
  if (canAccess(role, "websites")) return "/websites";
  return "/sales";
}
