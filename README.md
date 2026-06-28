# ⏱️ ChronoTrack — Civil Mantra Transparent Telemetry & Workforce ROI

ChronoTrack is a privacy-respecting workforce telemetry + project-ROI platform for
desk-bound teams. A lightweight desktop agent records **input densities** (keystroke/
mouse *counts*, never content) and **active window titles** (sanitised), syncs them to
a secure multi-tenant cloud, and turns them into per-employee utilisation and
per-project cost/ROI for team leads and admins.

> Built for Civil Mantra (≈1,600 employees) to measure true utilisation and project
> profitability. DPDP-aware (India), consent-based, human-in-the-loop.

**Status:** web platform live in production (Vercel + Neon); Linux agent proven;
Windows agent pending one build + clean-VM test. See **[docs/ROADMAP.md](docs/ROADMAP.md)**
for pilot readiness and **[docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md)** to record a demo.

---

## Architecture

```
 Employee PC                          Vercel (cloud)              Neon Postgres
┌───────────────────────┐           ┌──────────────────┐        ┌──────────────┐
│ Electron desktop agent │           │  React SPA       │        │ companies    │
│  ├ onboarding+consent  │           │  serverless API  │◄──────►│ users        │
│  └ display only        │           │  (JWT, RBAC,     │        │ projects     │
│ Telemetry daemon       │  HTTPS    │   multi-tenant)  │        │ telemetry    │
│  ├ xinput/xprop/hooks  │  device   │                  │        │ time_entries │
│  ├ local SQLite buffer │  token    │  /api/ingest     │        │ consents     │
│  └ batch cloud sync ───┼──────────►│  /api/analytics  │        │ audit_logs   │
└───────────────────────┘           └──────────────────┘        └──────────────┘
```

- **Backend:** Vercel serverless functions (`api/`), JWT + bcrypt auth, role-based
  (admin / lead / employee), per-row `company_id` tenant isolation.
- **DB:** Neon Postgres. Versioned migrations in `deployment/migrations/`.
- **Desktop agent:** Electron shell + Python telemetry daemon (bundled as a
  self-contained binary via PyInstaller — no Python needed on target machines).
- **Privacy:** densities + sanitised window titles only; explicit consent at
  activation; consent withdrawal revokes the device and halts collection.

## Repository layout
```
api/            serverless endpoints (auth, users, projects, activation, ingest,
                time-entries, consent, analytics)
lib/            db pool, auth (bcrypt/JWT), http guard, rate limit, audit
deployment/     SQL migrations + corporate deploy scripts
src/            React SPA (admin / team-lead / employee web + desktop agent UI)
src-daemon/     Python telemetry daemon + PyInstaller build script
scripts/        migrate, seed-admin, integration + daemon E2E tests, dev API
tests/e2e/      Playwright browser ("preview") tests
main.cjs        Electron main (spawns daemon, serves SPA over loopback)
```

## Quick start (local, all-in-one)
```bash
npm install

# 1. Postgres
docker run -d --name ct_pg -e POSTGRES_PASSWORD=test -e POSTGRES_DB=chronotrack \
  -p 5544:5432 postgres:16-alpine
export DATABASE_URL="postgres://postgres:test@localhost:5544/chronotrack" PGSSL=disable \
       JWT_SECRET="$(openssl rand -hex 32)"

# 2. Schema + first admin
npm run migrate
COMPANY="Civil Mantra" ADMIN_EMAIL=admin@cm.com ADMIN_PASSWORD=change-me-strong npm run seed:admin

# 3. Backend API + web
API_PORT=3031 node scripts/dev-api.js &
VITE_API_BASE="http://localhost:3031" npm run dev   # http://localhost:5173
```

## Build the desktop agent
```bash
npm run build           # SPA
npm run build:daemon    # PyInstaller daemon binary (needs a venv w/ pyinstaller)
npm run electron:build  # electron-builder -> dist-desktop/ (AppImage, deb; win via CI)
```
Windows `.exe` is produced by the **GitHub Actions release workflow** (Windows runner)
— see `.github/workflows/release.yml`. Cross-building Windows from Linux is not used.

## Tests
| Command | Coverage | Needs |
|---|---|---|
| `npm run test:api` | backend, auth, RBAC, analytics, activation, ingest (29 checks) | Docker Postgres |
| `npm run test:daemon` | daemon→cloud sync, offline buffer, consent revoke (9 checks) | Docker Postgres |
| `npm run test:e2e` | Playwright web flows (login, dashboards, ROI) | browser + live stack |

## Deploy
See **[DEPLOY.md](DEPLOY.md)** for the full Neon + Vercel + signing + pilot runbook,
and **[docs/DPIA-brief.md](docs/DPIA-brief.md)** for the privacy/legal brief to give counsel.

## Security & privacy
- bcrypt(12) passwords, signed JWT (8h), per-request auth, per-device revocable tokens.
- Multi-tenant `company_id` scoping; server-side role + authority enforcement.
- Activation codes hashed, single-use, expiring. Rate-limited login + ingest.
- DPDP: consent recorded at activation, withdrawal honoured; audit trail on mutations.
- See [PLAN.md](PLAN.md) for the threat model and roadmap.

## License
MIT — see [LICENSE](LICENSE).
