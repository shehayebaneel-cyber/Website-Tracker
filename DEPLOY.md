# Deploying Website Tracker

The app deploys as **one Render web service**: the Express server serves both the
API and the built React SPA from the same origin (so the session cookie needs no
cross-site configuration). Database is **Neon Postgres**.

> Nothing here runs automatically. This is the checklist for the first deploy —
> run it when you're ready.

## 1. Create the database (Neon)
1. Create a Neon project (region close to Lebanon, e.g. EU).
2. Copy the **pooled** connection string (`...-pooler...`, `sslmode=require`).

## 2. Create the Render service
Option A — Blueprint: push this repo to GitHub, then in Render "New → Blueprint"
and point it at `render.yaml`. Set the `sync: false` env vars when prompted:
- `DATABASE_URL` = your Neon string
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` = the first owner login (seed uses these)

Option B — manual Web Service:
- Build: `cd web && npm install && npm run build && cd ../server && npm install && npm run build`
- Start: `cd server && npx prisma migrate deploy && node dist/index.js`
- Health check path: `/api/health`
- Env: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET` (generate), `ADMIN_*`

## 3. First-run seed
`prisma migrate deploy` creates the schema. To create the admin user + dropdown
lists on a fresh DB, run once (Render Shell): `cd server && npm run db:seed`.
With `NODE_ENV=production` the seed **automatically skips all sample/demo data**
— you get a clean database with just your admin login and the dropdown lists.
(To force-skip sample data anywhere, set `SEED_SAMPLE=false`.)

## 4. After deploy
- Log in, go to **Settings → Users**, and change the admin password (or create your
  real owner account and disable the seed one).
- `secure` cookies + HTTPS are automatic on Render (`NODE_ENV=production`).
- Set `CORS_ORIGIN` only if you later split the web app onto its own domain.

## Notes
- `render.yaml` pins `region: frankfurt`; change if you prefer.
- Backups: enable Neon's point-in-time restore; take a manual branch/snapshot
  before any destructive migration.
- This repo's local dev uses a **portable** Postgres on port 5433 (see README);
  production is entirely separate (Neon).
