import type { Request } from "express";

export function paging(req: Request) {
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  const pageSize = Math.min(200, Math.max(1, parseInt((req.query.pageSize as string) || "50", 10)));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Parse "YYYY-MM" to first-of-month Date (local). */
export function parseMonthKey(v: unknown): Date | null {
  if (typeof v === "string" && /^\d{4}-\d{2}$/.test(v)) {
    const [y, m] = v.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }
  return null;
}
