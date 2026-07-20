# Website Tracker — CLAUDE.md

## What this is
Private internal admin system (single user: Aneel) to manage every client
website business-wide: clients, websites, subscriptions, invoices, payments,
expenses, support tickets, domain/hosting/SSL renewals, and a live dashboard.
It replaces the *Websites Tracker.xlsx* workbook — the app/DB perform all
calculations; the broken spreadsheet formulas are NOT copied, business rules are.

## Stack & layout
- web/ (Vite + React + Tailwind v4 + React Router + Recharts) — port **5180**
- server/ (Express + Prisma + PostgreSQL, JWT-cookie auth, Zod) — port **4020**
- DB: local **portable** PostgreSQL 17 on port **5433**, data in `server/.pgdata`
  (NOT a Windows service — `scripts/pg-start.ps1` after reboot). Binaries: `C:\Users\sheha\pgsql`.
- Deploy: not yet deployed. Plan → Neon Postgres + Render (ask before first deploy).

## Commands
- Start DB: `powershell -File scripts/pg-start.ps1` (stop: `pg-stop.ps1`)
- Dev: `cd server && npm run dev` + `cd web && npm run dev`
- Typecheck: `npx tsc --noEmit` in web/ and server/ (both pass clean)
- Migrate: `cd server && npx prisma migrate dev`
- Seed: `cd server && npm run db:seed`  ·  Studio: `npm run db:studio`
- npm here gates install scripts: after `npm install`, run `npm approve-scripts <pkg>`
  (prisma, @prisma/client, @prisma/engines, esbuild) — already recorded in package.json.

## Design
- Branded **"IGNIS System"**: warm IGNIS identity — near-black warm ink, cream surfaces,
  IGNIS orange accent (`--accent` #e8712b) + a flame mark (`.flame-mark`), tabular numbers,
  dense tables on desktop → cards on mobile. Recharts primary series use the orange (#e8712b).
- Status colors (spec §17): good=green, due-soon/waiting=yellow, partial/attention=orange,
  overdue/expired/urgent=red, cancelled/paused/future/not-tracked=grey. Mapped in
  `web/src/lib/format.ts` (`statusTone`) + `.pill-*` classes in `index.css`.
- Theme-aware (light/dark/system toggle in sidebar).

## Domain rules (the stuff that's easy to get wrong)
- **Derived, never stored**: balances, invoice status, collection rate, days-remaining,
  renewal/SSL status, paid-through, next-due. All live in `server/src/lib/calc.ts` +
  `serialize.ts`. Never persist these.
- **Invoices snapshot their amount** at creation (`amount` + `discount`); changing a
  client's `monthlyFee` must NOT rewrite past invoices.
- Invoice balance = amountDue − Σ(linked payments). One invoice → many payments; one
  client → many invoices. A subscription invoice is unique per client per billing month.
- Renewal status: <0d Expired · ≤30 Due in 30 · ≤60 Due in 60 · else OK · null Not Tracked.
- **Credentials**: store only a reference (e.g. password-manager location), never a raw password.
- Soft delete only (`deletedAt`), never hard delete. `ActivityLog` records who/what.
- ID formats: `C001`, `WEB-C001-01`, `INV-202607-C001-01`, `PAY-20260720-001`,
  `EXP-202607-001`, `TKT-202607-001` — generators in `server/src/lib/ids.ts`.
- Dropdown option lists are data (`OptionList` table), not hardcoded — Settings will edit them.

## IGNIS public website (`public/` app)
- Customer-facing marketing site + (later) application/support/portal, in `public/` (port **5190**),
  sharing the same Express backend (`/api` proxied). Separate from the internal `web/` admin app.
- **Brand** (from the client's pricing sheets in Downloads): white bg, near-black text, warm IGNIS
  orange `#e8712b`, flame logo motif, Poppins display + Inter body (Google Fonts). Tokens in
  `public/src/index.css`. WhatsApp: **+961 81 703 597** (in `data/content.ts`).
- **Phase 1 — DONE**: Home, Plans (+ responsive comparison, mobile → cards), Business Systems,
  Our Work (filterable, placeholder projects), How It Works, About, Contact (form → WhatsApp), FAQ.
  Mobile-first, WhatsApp FAB + click-to-call. `/start`, `/support`, `/login` are stubs.
  Verified brand match desktop + mobile. Plans/modules/prices copied exactly from the sheets.
- **Gotcha**: global `h1–h4` are dark (var(--ink)); on dark/black bands set `color:#fff` inline
  (see CTABand) or the heading is invisible.
- **Public Phase 2 — DONE**: multi-step **application form** (`public/src/pages/Start.tsx`) — 5 steps,
  conditional needs, file uploads, `?plan=`/`?ref=` prefill, save-and-continue (localStorage), review +
  consent, confirmation with reference number. Submits to **public (unauthenticated) API**
  (`server/src/routes/public.ts`, mounted before `requireAuth`): `/api/public/ref/:code` (validate
  salesperson), `/api/public/uploads` (multer → `server/uploads/`, type/size limited), `/api/public/
  applications` (rate-limited + honeypot) → creates an **Application** + CRM **Lead** (source
  "Website Inquiry", salesperson resolved from ref code server-side, else first active) + LeadActivity +
  a Notification for the salesperson's user. Admin views them in **Sales → Applications**
  (`web` section `applications`, OWNER/MANAGER) with status management (customer-friendly §20 statuses)
  + link to the created lead. `APP-YYYYMM-NNN` codes.
  Static files served at `/uploads` (unguessable names; gate/cloud-store later).
- **Public Phase 3 — DONE**: client **Support form** (`public/src/pages/Support.tsx`) — per-type conditional
  fields (bug/update/design), file uploads, urgency with required business-impact, confirmation with ticket
  number; **Track page** (`Track.tsx`) — reference + contact-verified status timeline (privacy-gated, 403 on
  mismatch). Server `/api/public/support` (rate-limited + honeypot) creates a **SupportTicket** (`requestSource`
  "Website Form"), auto-matches an existing client by code/phone/business name, maps friendly priority, notifies
  the client's salesperson; `/api/public/track` returns `friendlyStatus`. Admin **Support** screen shows a
  **Website** badge (matched) / **Unlinked** badge (no client yet), and the ticket detail shows a read-only
  "Submitted from the website" intake panel (requester contact, page, device, steps, business impact,
  attachment thumbnails) + link-to-client for unlinked requests. `SUP-YYYYMM-NNN` codes. Web dev proxies
  `/uploads` so attachments render. Verified end-to-end desktop + mobile.
- **Public Phase 4 (next)**: client login/portal (auth CLIENT role).

## Sales module (commission-only sales team)
- **Roles**: added `SALESPERSON` + `MANAGER` to `lib/perms.ts` with new sales sections.
  SALESPERSON has **row-level scoping** — `attachSalesContext` (lib/sales.ts) resolves their
  Salesperson record by `userId` and every sales route filters to `req.salespersonId`.
  Verified: a salesperson is 403'd from the admin list AND from the main `/clients` API.
- **Economics**: client $20/mo → salesperson $5 → company $15. Commission is **Fixed $ or %**,
  stored per-client on `ClientAssignment` (overrides the salesperson default), **collected-based**.
- **Data**: `Salesperson`, `Lead`, `LeadActivity`, `ClientAssignment` tables (+ assignment
  commission fields). Convert-to-client creates Client + Website + Assignment and marks lead Won.
- **Frontend**: sales nav group (role-aware — salespeople see only their scoped, mobile-first
  portal at `/sales`); Sales Dashboard (admin + salesperson views), Sales Team, salesperson
  profile, Leads (+ dup detection, activities, convert), My Clients.
- **Phase 1 — DONE** (auth/roles, sales team, leads, convert, assignment, dashboards). Verified
  both roles, desktop + mobile, and the full create→dup-check→convert→assign→dashboard flow.
- **Sales Phase 2 (next)**: monthly follow-ups, support-request link, **commission engine**
  (generate from collected payments, one entry per month, eligibility rules), commission review.
- **Sales Phase 3**: payout batches + statements (PDF), client reassignment, salesperson
  departure workflow, sales reports, notifications.
- Sample sales data (dev only): SP001 login `sales@test.local` / `salespass1`; plus test leads
  (Sunset Barbershop) and a converted client (C006 Cedar Bites Diner) from verification.

## Current status / next up
- **Milestone 1 — DONE**: auth, Dashboard, Clients (list + profile + CRUD + pause/cancel),
  Websites (list + detail + CRUD + renewals).
- **Milestone 2 — DONE**: Billing (invoice create + monthly generation w/ preview + duplicate
  prevention), Payments (record, partial, overpayment guard), Expenses (CRUD + recurring),
  Support tickets (CRUD + extra-work billing + deadline status), Monthly Overview (year grid),
  Alerts feed (`/alerts`, live reminders). Client-profile quick actions wired. Verified desktop + mobile.
  Note: invoice status filter on Billing filters the current page only (derived status).
- **Milestone 3 — DONE**: Roles & permissions (OWNER/STAFF/DEVELOPER, `lib/perms.ts` +
  `requireSection` gating; role-aware nav via `web/src/lib/perms.ts`), Reports (aggregations +
  filters + client-growth chart) with **CSV export** per entity + Print/PDF, Activity Log page,
  Settings UI (Company config, Dropdown-list editor, Users management, Data import/export),
  Clients **CSV import** with preview + dedupe. Verified roles return 403 correctly.
- **Reminders — DONE (no provider needed)**: review-before-send flow. `ReminderModal` generates
  an editable message (company name from Settings config via `/api/app`), sends via **WhatsApp
  click-to-chat** (`wa.me`) or copy, and records reminder status (Not Sent/Sent/Followed Up/
  Payment Promised) on the invoice. Wired into Alerts + client-profile Invoices tab.
- **Deploy — ARTIFACTS READY, not deployed** (needs your go + accounts): single Render web service
  serves API + built SPA same-origin (`index.ts` serves `web/dist` in production). See `render.yaml`
  + `DEPLOY.md`. Target: Neon Postgres. Both prod builds validated locally.
- **Still deferred (need external accounts)**: automated email/WhatsApp *API* sending (current flow
  is manual-send, which is what the spec's review-before-send asks for), cloud file storage for
  receipt uploads, full .xlsx (vs CSV) import/export.
- Sample/test data to delete: C002/C003 `[Sample]`; C004 Acme Bakery + C005 Olive Grove (import test);
  a `dev@test.local` DEVELOPER user; generated Aug-2026 invoices + a partial test payment.
