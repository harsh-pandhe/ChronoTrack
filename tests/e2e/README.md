# E2E "preview tests" (Playwright)

Browser tests of the real web flows (login, dashboards, analytics). They need a
browser, so run them on a dev machine or CI (not in a headless sandbox lacking
`/dev/shm`).

## One-time
```bash
npm i -D @playwright/test
npx playwright install chromium
```

## Bring up the stack
```bash
# 1. Postgres
docker run -d --name ct_e2e_pg -e POSTGRES_PASSWORD=test -e POSTGRES_DB=chronotrack \
  -p 5544:5432 postgres:16-alpine
export DATABASE_URL="postgres://postgres:test@localhost:5544/chronotrack" PGSSL=disable JWT_SECRET="e2e-secret"

# 2. Schema + seed admin + a lead
npm run migrate
COMPANY="ChronoTrack" ADMIN_EMAIL=admin@cm.com ADMIN_PASSWORD=admin-strong-pass npm run seed:admin
#   then create lead rajesh@cm.com / lead-strong-pass via the API or admin UI

# 3. Cloud API
API_PORT=3031 node scripts/dev-api.js &

# 4. Build SPA at the API base + serve it
VITE_API_BASE="http://localhost:3031" npm run build
(cd dist && python3 -m http.server 4300) &
```

## Run
```bash
BASE_URL=http://localhost:4300 npx playwright test
```

## What's covered
- Admin login → real portfolio analytics render
- Admin Contribution ROI → logged hours present
- Admin User Directory → real employees
- Team Lead → live board + manage projects
- Invalid login rejected

## Note on the in-process suite
`npm run test:api` (29 checks) and `npm run test:daemon` (9 checks) run headless
with only Docker Postgres — no browser needed — and cover the backend, auth,
RBAC, analytics, activation, ingest, and daemon→cloud sync. Those are the
primary automated gates; these Playwright specs add UI-layer coverage.
