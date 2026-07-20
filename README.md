# Website Tracker & Client Management

Private internal system to manage every client website: clients, websites,
billing, payments, expenses, support tickets, renewals and a live dashboard.
Turns the original *Websites Tracker.xlsx* workbook into a proper relational
system where every balance and status is **computed by the app**, not by
spreadsheet formulas.

## Stack
- **web/** — React + Vite + Tailwind v4 + React Router + TypeScript (strict), Recharts
- **server/** — Node + Express + Prisma → PostgreSQL, JWT-cookie auth, Zod validation
- **DB** — local portable PostgreSQL 17 on **port 5433** (data in `server/.pgdata`)

Ports: web `5180`, API `4020`, Postgres `5433`.

## First-time setup (already done once)
```bash
# in server/
npm install
npx prisma migrate dev      # create schema
npm run db:seed             # settings + admin user + sample data
# in web/
npm install
```

## Running day-to-day
```powershell
# 1. Start the database (portable — not a Windows service, so run after reboot)
powershell -File scripts/pg-start.ps1
```
```bash
# 2. Start the API   (in server/)
npm run dev            # http://localhost:4020
# 3. Start the web    (in web/)
npm run dev            # http://localhost:5180
```

Login with the credentials in `server/.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
**Change `ADMIN_PASSWORD` and `JWT_SECRET` before any real use.**

## Status: Milestone 1 (built)
Auth · Dashboard · Clients (list + profile + CRUD) · Websites (list + detail +
CRUD, domain/hosting/SSL renewal tracking). Billing, Payments, Expenses, Support,
Monthly Overview, Reports, Settings and Excel import are scaffolded in the data
model/API and come in Milestones 2–3.

The 3 sample records: **Grey Clinics (C001)** is real (from the workbook).
**C002 / C003 are `[Sample]` placeholders** — safe to delete once you add real clients.

## Notes
- Passwords/credentials are never stored — only a reference (e.g. "1Password → X").
- Records are soft-deleted (archived), never hard-deleted.
- All money is derived from immutable invoice/payment snapshots.
