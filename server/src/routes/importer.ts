import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { nextClientCode } from "../lib/ids.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

// Minimal RFC-4180-ish CSV parser (handles quotes, commas, newlines in quotes).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch === "\r") { /* skip */ }
    else field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const HEADER_MAP: Record<string, string> = {
  "business name": "businessName", business: "businessName",
  "contact name": "contactName", contact: "contactName",
  phone: "phone", city: "city",
  "monthly fee": "monthlyFee", fee: "monthlyFee",
  "service plan": "servicePlan", plan: "servicePlan",
  "billing day": "billingDay",
  status: "status", website: "website", notes: "notes",
};

function mapRows(csv: string) {
  const rows = parseCsv(csv);
  if (rows.length < 2) return { headers: [], records: [] as Record<string, string>[] };
  const headers = rows[0].map((h) => HEADER_MAP[h.trim().toLowerCase()] ?? h.trim().toLowerCase());
  const records = rows.slice(1).map((r) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => { rec[h] = (r[i] ?? "").trim(); });
    return rec;
  });
  return { headers, records };
}

// ---- preview --------------------------------------------------------------
router.post("/clients/preview", async (req, res) => {
  const csv = String(req.body?.csv ?? "");
  const { records } = mapRows(csv);
  if (records.length === 0) return res.status(400).json({ error: "No rows found. Include a header row (Business Name, Phone, Monthly Fee, …)." });

  const existing = await prisma.client.findMany({ where: { deletedAt: null }, select: { businessName: true, phone: true } });
  const names = new Set(existing.map((c) => c.businessName.toLowerCase()));
  const phones = new Set(existing.filter((c) => c.phone).map((c) => c.phone!.toLowerCase()));

  const seen = new Set<string>();
  const rows = records.map((rec) => {
    const businessName = rec.businessName || "";
    let status: "new" | "duplicate" | "invalid" = "new";
    let reason = "";
    if (!businessName) { status = "invalid"; reason = "missing business name"; }
    else if (names.has(businessName.toLowerCase()) || (rec.phone && phones.has(rec.phone.toLowerCase()))) { status = "duplicate"; reason = "already exists"; }
    else if (seen.has(businessName.toLowerCase())) { status = "duplicate"; reason = "duplicated in file"; }
    seen.add(businessName.toLowerCase());
    return {
      status, reason,
      data: {
        businessName,
        contactName: rec.contactName || null,
        phone: rec.phone || null,
        city: rec.city || null,
        website: rec.website || null,
        monthlyFee: rec.monthlyFee ? Number(rec.monthlyFee.replace(/[^0-9.]/g, "")) || 0 : 0,
        servicePlan: rec.servicePlan || null,
        billingDay: rec.billingDay ? Math.min(31, Math.max(1, parseInt(rec.billingDay, 10))) || null : null,
        status: rec.status || "Active",
        notes: rec.notes || null,
      },
    };
  });
  const summary = { total: rows.length, new: rows.filter((r) => r.status === "new").length, duplicate: rows.filter((r) => r.status === "duplicate").length, invalid: rows.filter((r) => r.status === "invalid").length };
  res.json({ rows, summary });
});

// ---- commit ---------------------------------------------------------------
const commitSchema = z.object({
  rows: z.array(z.object({
    businessName: z.string().min(1),
    contactName: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    monthlyFee: z.number().optional(),
    servicePlan: z.string().nullable().optional(),
    billingDay: z.number().nullable().optional(),
    status: z.string().optional(),
    notes: z.string().nullable().optional(),
  })),
});

router.post("/clients/commit", async (req, res) => {
  const parsed = commitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid rows" });

  const existing = await prisma.client.findMany({ where: { deletedAt: null }, select: { businessName: true } });
  const names = new Set(existing.map((c) => c.businessName.toLowerCase()));
  let created = 0;
  const skipped: string[] = [];

  for (const row of parsed.data.rows) {
    if (names.has(row.businessName.toLowerCase())) { skipped.push(row.businessName); continue; }
    await prisma.$transaction(async (tx) => {
      const code = await nextClientCode(tx);
      await tx.client.create({
        data: {
          code,
          businessName: row.businessName,
          contactName: row.contactName ?? null,
          phone: row.phone ?? null,
          city: row.city ?? null,
          website: row.website ?? null,
          monthlyFee: row.monthlyFee ?? 0,
          servicePlan: row.servicePlan ?? null,
          billingDay: row.billingDay ?? null,
          status: row.status ?? "Active",
          notes: row.notes ?? null,
        },
      });
    });
    names.add(row.businessName.toLowerCase());
    created++;
  }
  await logActivity(req, "Client", null, "import", `Imported ${created} client(s) from CSV`);
  res.json({ created, skipped });
});

export default router;
