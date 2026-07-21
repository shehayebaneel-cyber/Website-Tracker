# Website Tracker — single image: builds the React SPA + Express API, and the
# server serves both on one origin. DB is Neon Postgres (env vars set in Render).
FROM node:22-bookworm-slim

# Prisma needs OpenSSL at build (engine) and runtime.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Build the admin dashboard (served at /app) — needs dev deps: vite + tsc.
# --include=dev forces them even if NODE_ENV=production leaks into the build.
RUN cd web && npm install --include=dev && npm run build

# Build the public marketing site (served at /).
RUN cd public && npm install --include=dev && npm run build

# Build the server (postinstall + build run prisma generate for linux, then tsc).
RUN cd server && npm install --include=dev && npm run build

WORKDIR /app/server
ENV NODE_ENV=production
# Render provides PORT at runtime; the server listens on process.env.PORT.
EXPOSE 4020

# Apply any pending migrations (no-op if already applied), then start.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
