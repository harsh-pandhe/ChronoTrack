# ChronoTrack Backend (Phase 1)

Secure multi-tenant API for ChronoTrack. Vercel serverless functions (`api/`) +
Neon Postgres. JWT + bcrypt auth, per-device tokens for the telemetry daemon,
DPDP-compliant consent. See [PLAN.md](PLAN.md) for the full roadmap.

## Layout
```
deployment/migrations/   versioned SQL (apply in order)
lib/                     db pool, auth (bcrypt/JWT), http guard, audit
api/auth/                login, me
api/users/               list/create, update/disable  (role + authority enforced)
api/projects/            list (with live cost+ROI), create, update/archive
api/activation/          generate (admin/lead), verify (desktop activation)
api/ingest.js            daemon telemetry batch (device-token auth)
api/time-entries.js      "what project?" attribution → ROI
api/consent.js           DPDP consent status + withdrawal (revokes devices)
scripts/                 migrate, seed-admin, test-api
```

## Local setup
```bash
npm install

# 1. Postgres (ephemeral docker for dev/test)
docker run -d --name chronotrack_pg -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=chronotrack -p 5544:5432 postgres:16-alpine

export DATABASE_URL="postgres://postgres:test@localhost:5544/chronotrack"
export PGSSL=disable
export JWT_SECRET="$(openssl rand -hex 32)"

# 2. Migrate
npm run migrate

# 3. Seed the first admin (one-time bootstrap, no default credentials)
COMPANY="ChronoTrack" ADMIN_EMAIL=admin@cm.com ADMIN_PASSWORD=change-me-strong \
  npm run seed:admin

# 4. Integration test (resets schema, drives the full IRL loop — 23 checks)
npm run test:api
```

## Production (Vercel + Neon)
1. Create a Neon Postgres DB (Vercel Marketplace) → copy the connection string.
2. Set env vars in Vercel: `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS`,
   `CONSENT_VERSION`. (`PGSSL` unset → TLS verified.)
3. Run migrations against Neon: `DATABASE_URL=... npm run migrate`.
4. Seed the first admin once via `scripts/seed-admin.js`.
5. Deploy. Functions in `api/` are auto-detected; `vercel.json` keeps SPA routing
   from swallowing `/api/*`.

## Security model
- **Passwords:** bcrypt (cost 12). No default credentials anywhere; app refuses to
  boot in production without `JWT_SECRET`.
- **Sessions:** signed JWT (8h TTL), verified per request against the live user row.
- **Roles + authority:** admin / lead / employee. Leads manage only their own team's
  employees, and only with `can_manage_employees` (admin-granted). Enforced server-side.
- **Multi-tenant:** every row carries `company_id`; all queries scoped to the caller's.
- **Device auth:** daemon ingest uses a per-device bearer token (hashed at rest,
  revocable). `company_id`/`user_id` derive from the device, never the payload.
- **Activation codes:** 8-digit, hashed, single-use, 7-day expiry.
- **DPDP:** activation requires explicit consent; withdrawal revokes devices and
  halts collection. Audit trail on every privileged mutation.

## What's NOT done yet (next phases)
Frontend still uses localStorage + the old simulator — Phase 4 rewires it to this
API. Daemon does not yet push to `/api/ingest` — Phase 3. Rate limiting, RLS,
PyInstaller bundling, code signing, load test — Phases 5–6. See [PLAN.md](PLAN.md).
