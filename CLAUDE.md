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
- DB: **Neon Postgres, shared by both PCs** so the data stays in sync — set per-PC in
  `server/.env` (gitignored). Local dev uses the **`dev` branch** (`ep-dry-snow-av0bvlxw`);
  the production branch is Render's and local dev must never point at it. Nothing to start
  before `npm run dev`. **Consequence: a migration or seed run on one PC is already applied
  for the other — only the code has to travel, via git.**
- `scripts/pg-start.ps1` is left over from the earlier local portable PostgreSQL 17 setup
  (port 5433, `server/.pgdata`). Its binaries path is hardcoded to `C:\Users\sheha\pgsql`,
  so it fails on the `arami` PC. Not needed while `.env` points at Neon.
- **DEPLOYED AND LIVE: https://website-tracker-tvd8.onrender.com** — Render web service built
  from the **`Dockerfile`** (not `render.yaml`'s buildCommand; keep the two in step anyway),
  serving the public site at `/` and the admin app at `/app`. **Auto-deploys on push to `main`**
  (~90s to go live). It runs against the Neon **production** branch (`ep-solitary-math-avho26j4`),
  which is a DIFFERENT database from local dev — **local `migrate dev` / seeds never touch it**.
  On boot it runs `prisma migrate deploy`, then the pricing seed with `PRICING_SEED_IF_EMPTY=true`
  (fills a catalogue-less DB, no-ops in ~3s once one exists, failure is logged and start
  continues). **So: a phase that adds a table also needs its data considered for production.**

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

## Pricing system (public site: Pricing · Feature Packs · Builder · Help Me Build)
- **The model is ADDITIVE** (rebuilt from scratch on branch `pricing-v2`, replacing the old
  Basic/Standard/Premium plans): `monthly total = base website + core systems + feature packs`.
  Every customer starts on the **$10 base website**. **Booking +$10** and **E-commerce +$10** are
  priced in their own right, so both together cost exactly $20 *by construction* — there is no
  combined price to keep in step, and adding the second system later costs exactly what it costs
  alone. **Six flat $5 feature packs** replace 71 individual add-ons; related capability lives in
  exactly one pack, which is what removes overlap and double charging.
- **The $60 maximum is DERIVED, never asserted**: `maxStandardMonthly()` = base + every system +
  every pack. A test selects *literally everything* (both systems, six packs, all one-time
  services, all external costs) and asserts the monthly total is still $60 — which simultaneously
  proves one-time and external costs can never leak into a monthly total.
- **Single source of truth is the DATABASE**, never the web apps. `BaseWebsite`+`BaseInclusion`,
  `CoreSystem`+`SystemInclusion`+`SystemLimit`, `FeaturePack`+`PackFeature`, `OneTimeService`,
  `ExternalCost`, `ComparisonRow`, `RecommendedSetup`, `PricingFaq`, `PricingTerm`,
  `PricingContent`, `BusinessType`, `PlanConfiguration`.
  **Never hardcode a price, limit, eligibility rule or pricing heading in `public/` or `web/`.**
- **`server/src/lib/pricing.ts` is the engine** — pure, no Prisma/Express, so the public app
  **imports the very same module** (vite alias `@engine` → `../server/src/lib/pricing.ts`, mirrored
  in `public/tsconfig.json` paths; Docker `COPY . .` precedes the public build so it resolves in
  production). Not a copy — there is no second implementation to drift.
  `quote(catalogue, selection)` resolves: duplicate systems/packs charged once · packs needing a
  system the customer lacks → an **`unmet` entry naming the fix and its price**, never a bare error
  · limits (`Capacity & Scale` is the pack flagged `raisesLimits`, lifting every limit at once) ·
  monthly / one-time / external split. `packsLostWithout()` answers "what dies if I remove this
  system" so removal can ask first. Totals are DERIVED, never stored.
- **`SystemLimit` holds `baseValue` + `upgradedValue`** — one pack raises services 30→100, staff
  3→10 and products 50→250 together, instead of charging per dimension.
- Seed: `npm run db:seed:pricing` (idempotent — upserts by key, editable content only created when
  empty, so admin edits survive). `PRICING_RESEED=true` forces a reset; `PRICING_SEED_IF_EMPTY=true`
  (used by the production start command) fills an unseeded DB and no-ops otherwise.
- **Tests: `npm run test:pricing`** — every scenario in §32 of the spec against the real catalogue:
  $10 / $20 / $20 / $30 / $35 / $40 / $60, dependency offers, removal warnings, duplicates,
  quotation items, external costs, and the worked examples priced from their own contents.
  **73 assertions.** Run after any pricing change.
- Public API (unauthenticated, before `requireAuth`): `GET /api/public/pricing/catalogue`,
  `POST /quote`, `POST /configurations`. Submissions are **re-priced server-side** and rejected if
  any requirement is unmet; the stored `breakdown` is an immutable snapshot.
  **Verified parity: 12 selections, browser vs `/quote`, byte-identical JSON.**
- **Public pages**: `/plans` (Pricing — four starting options showing their arithmetic, comparison,
  worked examples, one-time + external + terms), `/business-systems` (Feature Packs — search,
  filters, expandable detail), `/builder`, `/help-me-build` (questionnaire — one question per system
  and per pack, generated from the catalogue with wording in `PricingContent`).
- **The customer's selection lives in `public/src/lib/configuration.tsx`** (context + localStorage),
  never in a page, so choices survive moving between Pricing, Feature Packs and the builder (§22).
  Start Over confirms; removing a system confirms and names the packs that would go.
- **Admin**: `web/src/pages/Pricing.tsx` (`/pricing`, gated to `settings`) edits *everything* — base,
  systems + limits + inclusion lists, packs + compatibility + contents, one-time, external,
  comparison, examples, FAQ, terms, and page text including the questionnaire's questions. The
  derived maximum is shown at the top so an edit that moves the ceiling is visible as it is made.
  Verified: setting a pack to $7 immediately prices booking+loyalty at $27 and the maximum at $62.
- **Admin**: `web/src/pages/WebsiteRequests.tsx` (`/sales/website-requests`) reads submitted
  configurations — needed because a configuration is stored even when there is no salesperson to
  raise a lead from. Shows the snapshot, not today's prices. Configurations sent under the old plan
  model still open and are labelled as such.
- **Gotcha**: a pack always needs at least one core system — an informational-only website cannot
  take packs. `Inventory & Suppliers` and `Delivery & Tracking` additionally require E-commerce.
- Sample/test rows to delete: `CFG-202607-001` (old model) and `CFG-202607-002` `[Test] Full Build`.


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
- **Deploy — LIVE** at https://website-tracker-tvd8.onrender.com (see the Stack section for how it
  builds and seeds). Single Render web service, same origin: public site `/`, admin `/app`, API
  `/api`. Auto-deploys on push to `main`.
  **Watch out:** the first deploys served empty pricing pages because production had the migrated
  tables but no catalogue — dev and production are separate Neon branches, and only dev had ever
  been seeded. Check production data, not just a green build, after any phase that adds tables.
- **LIVE SITE IS STILL ON THE OLD PLAN MODEL.** The pricing rebuild lives on branch
  **`pricing-v2`** (not merged, deliberately: pushing to `main` deploys in ~90s). Merging it will
  drop the old plan tables in **production** and seed the new catalogue on boot. Before merging:
  decide what happens to `PricingPlan`/`AddOn` data in production (the migration deletes the old
  catalogue content and the comparison/FAQ/term rows), and re-check the site after the deploy.
  The shared **dev** branch has already been migrated, so old code no longer runs against it.
- **Still deferred (need external accounts)**: automated email/WhatsApp *API* sending (current flow
  is manual-send, which is what the spec's review-before-send asks for), cloud file storage for
  receipt uploads, full .xlsx (vs CSV) import/export.
- Sample/test data to delete: C002/C003 `[Sample]`; C004 Acme Bakery + C005 Olive Grove (import test);
  a `dev@test.local` DEVELOPER user; generated Aug-2026 invoices + a partial test payment.
