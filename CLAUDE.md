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
- DB: **per-PC, set in `server/.env`.** This PC points at the **Neon `dev` branch**
  (no local server to start). The other PC runs local **portable** PostgreSQL 17 on port
  **5433** (`server/.pgdata`, NOT a Windows service — `scripts/pg-start.ps1` after reboot,
  binaries `C:\Users\sheha\pgsql`, so that script only works there).
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

## Pricing system (public site: Plans · Business Features & Add-ons · Plan Builder)
- **Single source of truth is the DATABASE**, never the web apps. `PricingPlan`,
  `PlanInclusion`, `AddOnCategory`, `AddOn`, `AddOnDependency`, `CapacityUpgrade`,
  `ComparisonRow`, `PricingFaq`, `PricingTerm`, `BusinessType`, `PlanConfiguration`.
  Plan cards, comparison table, feature catalogue, Plan Builder, WhatsApp message and
  the final summary ALL render from it — that is what stops them contradicting.
  **Never hardcode a price, limit or eligibility rule in `public/` or `web/`.**
- **`server/src/lib/pricing.ts` is the engine** — pure, no Prisma/Express, so the public
  app can mirror it and get identical numbers. `quote(catalogue, selection)` resolves:
  dependency auto-add (recursive) · Premium-required plan escalation with a visible
  reason · included-vs-charged against the FINAL plan (no duplicate charges) · capacity
  above allowance · monthly/one-time/external/quotation split · plan recommendation.
  Totals are DERIVED, never stored (same rule as `calc.ts`).
- **Recommendations never lie**: `kind` is `saves` | `same` | `unlocks`. With current
  prices Premium is never strictly cheaper than a Standard stack (Premium's $10 gap vs
  ~$8 of included value), so it surfaces as `unlocks` — "for $2/month more" — not as a saving.
- Seed: `npm run db:seed:pricing` (idempotent — upserts by key, only creates editable
  content when empty, so admin edits survive). `PRICING_RESEED=true` forces a reset.
  Defaults live in `prisma/pricingData.ts`; 3 plans, 71 add-ons, 6 categories.
- **Tests: `npm run test:pricing`** — the spec's 9 scenarios + dependency/duplicate-charge
  rules against the real catalogue. 40 assertions, no test framework. Run after any
  pricing change.
- Public API (unauthenticated, mounted BEFORE `requireAuth`): `GET /api/public/pricing/
  catalogue`, `POST /api/public/pricing/quote`, `POST /api/public/pricing/configurations`.
  Submissions are **re-priced server-side** — a browser total is never trusted. Creates a
  `PlanConfiguration` (+ CRM `Lead` when an active salesperson exists) with a snapshot
  breakdown so later price changes never rewrite what the customer was shown.
- **Phase A — DONE** (model, engine, seed, tests, public API).
- **Phase B — DONE** (Plans page + plan cards from the DB). `public/src/lib/catalogue.ts`
  types the `/catalogue` payload, fetches it **once per page load** (shared promise) and
  exposes `useCatalogue()` + display helpers (`priceLabel`, `addOnPrice`, `inclusionsFor`,
  `coreVariants`). `PlanCard` now takes a `CataloguePlan`: DB price/`priceIsFrom`/`priceNote`,
  heading, `ctaLabel`, `addOnHint`, and a **booking/store toggle** on plans whose inclusions
  differ by core system (so a Standard card never lists booking *and* store features).
  Plans page: cards, comparison table (columns generated from the plans themselves, `note`
  under the label, "Included"/"Not available" → check/dash), external costs and terms — all
  from the DB. Home renders the same cards + the entry price. On fetch failure the pages show
  a WhatsApp fallback and **never invent a price**. Removed `PLANS`/`Plan` from `content.ts`;
  the FAQ page now shows general Qs from `content.ts` + **pricing Qs and the glossary from the
  DB** (the static ones that hardcoded limits/eligibility were deleted).
- **Phase C — DONE** (Business features & add-ons catalogue). `BusinessSystems.tsx` renders all
  **55 sellable add-ons** from the DB with **search + category chips** (counts per category).
  The 16 `bundled` sub-features that ship inside a parent get **no card** — they aren't sold
  separately — but search still finds them *through* the parent (`matches()` searches name,
  blurb, bestFor, `includes`, the parent's bundled children, and the category name; all words
  must match). Card badges come from `addOnBadges()` in `lib/catalogue.ts`: Popular · "Included
  with Premium" (`includedInPlans`) · "Standard or above" (`minPlan`, suppressed when it's the
  lowest plan, when the add-on is already included in that plan, or when the item is bundled) ·
  dependency notes (the DB's own sentence when set, else generated — `coreRequirementLabel`
  uses the short "a booking system or an online store" form for two-part requirements).
  Prices via `addOnPrice()` (monthly / one-time / "By quotation" / "Included"). Cards use the
  **category** icon (add-on `icon` is null in seed data) with a `sparkle` fallback.
  Home's module grid is now the 6 **categories** with a live "N features · from $X/month".
  `content.ts` lost MODULES/EXTRA_MODULES/CHARGED_SEPARATELY — it now holds only price-free
  brand copy (TRUST, STEPS, PROJECTS, general FAQ, CONTACT).
  Feature cards link to `/start?feature=<addOnKey>`; `Start.tsx` resolves those keys to **names
  via the catalogue** (never from the URL text) into "Anything else you need?", de-duplicating
  so a re-mount or saved draft can't list a feature twice. The old `?module=` prefill still works.
- **Phase D — DONE** (Plan Builder, `/builder`, `public/src/pages/Builder.tsx`).
  **The public app does not copy the engine — it imports it.** `public/vite.config.ts` aliases
  `@engine` → `../server/src/lib/pricing.ts` (+ `server.fs.allow: [".."]`, matching `paths` in
  `public/tsconfig.json`; Docker `COPY . .` runs before the public build, so it resolves in
  production too). `src/lib/quote.ts` adapts the API payload to the engine's shape
  (`toEngineCatalogue` — the API nests a plan's allowances under `included`), and exposes
  `priceSelection`, `allowanceFor` and `quoteMessage` (the WhatsApp text, built from the quote).
  **Verified parity: 10 selections, client vs `POST /quote`, byte-identical JSON** — covering
  escalation, recursive auto-add, capacity, quotation items, one-time work and a blocked
  selection. Builder steps: plan → core system → capacity steppers (allowance-aware, respect
  `maxSteps`) → features by category → contact + submit. The summary shows every decision the
  engine made *for* the customer (escalations, auto-added dependencies, issues), the monthly /
  one-time / included / quotation / external groups, and the recommendation with a switch
  button. Mobile gets a sticky total bar (`.builder-bar`, padded clear of the WhatsApp FAB).
  Plan-card CTAs and feature-card CTAs now open the builder (`?plan=`, `?feature=`).
- **Two bugs found and fixed while verifying Phase D** (both in Phase A code):
  1. `recommend()` offered a **downgrade to a plan that cannot do what was asked**: pricing a
     booking setup against Basic silently dropped the core system, so "$10/month" looked like a
     $10 saving. `priced()` now rejects an alternative whose resolved `coreSystem` differs from
     the requested one. Covered by 2 new assertions (**42 total**).
  2. Both public routers shared **one rate-limit bucket across every limiter in the file**, so a
     burst of cheap `/quote` calls (or file uploads in `public.ts`) used up the 10/min budget for
     actually submitting. Each limiter now owns its bucket.
- Verified end-to-end: `CFG-202607-001` ($41/mo — Standard + booking, Loyalty auto-adding
  Customer Accounts, SMS Reminders, +30 services $6) is stored with its full breakdown snapshot.
  **No Lead was created because this DB has no Salesperson rows** — the documented fallback
  (the configuration is never lost); leads will start being created once a salesperson exists.
  Test row to delete later: `CFG-202607-001` "[Test] Phase D Check".
- Phases E–G (Help Me Choose, admin pricing editor, mobile pass) are next.

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
