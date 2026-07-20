import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { requireAuth } from "./middleware/auth.js";
import { prisma } from "./lib/db.js";
import authRouter from "./routes/auth.js";
import clientsRouter from "./routes/clients.js";
import websitesRouter from "./routes/websites.js";
import dashboardRouter from "./routes/dashboard.js";
import optionsRouter from "./routes/options.js";
import invoicesRouter from "./routes/invoices.js";
import paymentsRouter from "./routes/payments.js";
import expensesRouter from "./routes/expenses.js";
import supportRouter from "./routes/support.js";
import monthlyRouter from "./routes/monthly.js";
import alertsRouter from "./routes/alerts.js";
import reportsRouter from "./routes/reports.js";
import exporterRouter from "./routes/exporter.js";
import usersRouter from "./routes/users.js";
import activityRouter from "./routes/activity.js";
import settingsRouter from "./routes/settings.js";
import importerRouter from "./routes/importer.js";
import salespeopleRouter from "./routes/salespeople.js";
import leadsRouter from "./routes/leads.js";
import assignmentsRouter from "./routes/assignments.js";
import salesDashboardRouter from "./routes/salesDashboard.js";
import commissionsRouter from "./routes/commissions.js";
import followupsRouter from "./routes/followups.js";
import payoutsRouter from "./routes/payouts.js";
import portalRouter from "./routes/portal.js";
import publicRouter from "./routes/public.js";
import applicationsRouter from "./routes/applications.js";
import { requireSection } from "./lib/perms.js";
import { attachSalesContext } from "./lib/sales.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Public auth routes.
app.use("/api/auth", authRouter);

// Public (unauthenticated) website endpoints + uploaded files.
app.use("/api/public", publicRouter);
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// Everything below requires a valid session.
app.use("/api", requireAuth);

// Client portal (role CLIENT only; scoped to their own client record).
app.use("/api/portal", portalRouter);

// App bootstrap for the current user: role + currency + company name.
// Accessible to every authenticated role (used for nav, currency, reminder templates).
app.get("/api/app", async (req, res) => {
  const cfg = await prisma.config.findMany({ where: { key: { in: ["currency", "company"] } } });
  const map = Object.fromEntries(cfg.map((c) => [c.key, c.value]));
  let company = { name: "" };
  try { company = JSON.parse(map.company || "{}"); } catch { /* ignore */ }
  res.json({ role: req.user!.role, currency: map.currency || "USD", companyName: company.name || "" });
});

// Section-gated by role (see lib/perms.ts).
app.use("/api/dashboard", requireSection("dashboard"), dashboardRouter);
app.use("/api/clients", requireSection("clients"), clientsRouter);
app.use("/api/websites", requireSection("websites"), websitesRouter);
app.use("/api/invoices", requireSection("billing"), invoicesRouter);
app.use("/api/payments", requireSection("payments"), paymentsRouter);
app.use("/api/expenses", requireSection("expenses"), expensesRouter);
app.use("/api/support", requireSection("support"), supportRouter);
app.use("/api/monthly", requireSection("monthly"), monthlyRouter);
app.use("/api/alerts", requireSection("alerts"), alertsRouter);
app.use("/api/reports", requireSection("reports"), reportsRouter);
app.use("/api/export", requireSection("reports"), exporterRouter);
app.use("/api/activity", requireSection("activity"), activityRouter);
app.use("/api/users", requireSection("users"), usersRouter);
app.use("/api/settings", requireSection("settings"), settingsRouter);
app.use("/api/import", requireSection("settings"), importerRouter);
// Options list is needed by forms for every role.
app.use("/api/options", optionsRouter);

// ----- Sales module (row-level scoped via attachSalesContext) -----
app.use("/api/salespeople", attachSalesContext, salespeopleRouter);
app.use("/api/leads", attachSalesContext, leadsRouter);
app.use("/api/assignments", attachSalesContext, assignmentsRouter);
app.use("/api/sales-dashboard", attachSalesContext, salesDashboardRouter);
app.use("/api/commissions", attachSalesContext, commissionsRouter);
app.use("/api/followups", attachSalesContext, followupsRouter);
app.use("/api/payouts", attachSalesContext, payoutsRouter);
app.use("/api/applications", requireSection("applications"), applicationsRouter);

// In production, serve the built web app from the same origin as the API.
// Same-origin keeps the session cookie simple (no cross-site CORS/secure quirks).
if (process.env.NODE_ENV === "production") {
  const webDist = path.resolve(__dirname, "../../web/dist");
  app.use(express.static(webDist));
  // SPA fallback for any non-API route.
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(webDist, "index.html")));
}

// Central error handler.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[error]", err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const port = Number(process.env.PORT) || 4020;
app.listen(port, () => {
  console.log(`[server] Website Tracker API listening on http://localhost:${port}`);
});
