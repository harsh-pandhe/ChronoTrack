# ChronoTrack — Production Deploy & Release Runbook

Steps to take the verified build to a real pilot. Items marked **[needs creds]**
require accounts/secrets/hardware not available in the dev sandbox; everything
else has been tested locally (see BACKEND.md, PLAN.md).

---

## 1. Database — Neon Postgres **[needs creds]**
1. Create a Neon project (Vercel Marketplace → Neon) → copy the pooled
   connection string (`...neon.tech/...?sslmode=require`).
2. Apply schema:
   ```bash
   DATABASE_URL="postgres://...neon.tech/...?sslmode=require" npm run migrate
   ```
   (TLS is verified automatically — do not set `PGSSL=disable` in prod.)
3. Seed the first admin once:
   ```bash
   DATABASE_URL=... COMPANY="Civil Mantra" ADMIN_EMAIL=... ADMIN_PASSWORD=... \
     npm run seed:admin
   ```

## 2. Web portal — Vercel **[needs creds]**
1. Import the repo. Vercel auto-detects Vite (`npm run build`, output `dist`).
2. Set env vars (Project → Settings → Environment Variables):
   | Var | Value |
   |-----|-------|
   | `DATABASE_URL` | Neon pooled string |
   | `JWT_SECRET` | `openssl rand -hex 32` |
   | `ALLOWED_ORIGINS` | `https://<your-domain>` (and the Electron origin) |
   | `CONSENT_VERSION` | `1.0` |
   | `VITE_API_BASE` | empty (same-origin `/api`) |
3. Deploy. `api/*` become serverless functions; `vercel.json` keeps SPA routing
   off `/api/*`. Smoke test: `POST /api/auth/login`.

## 3. Desktop agent — build, sign, release
### Build (per OS, on that OS or CI)
```bash
npm run build            # SPA
npm run build:daemon     # PyInstaller binary -> dist-daemon/  (needs python+venv)
npm run electron:build   # electron-builder -> dist-desktop/  (bundles the binary)
```
The daemon binary is self-contained — **target machines need no Python**
(verified on Linux; run the same on Windows/macOS build hosts).

### Code signing **[needs certs]**
Unsigned installers are blocked by SmartScreen/Gatekeeper. Cert-generation
helpers exist in `deployment/`.
- **Windows:** Authenticode (EV cert recommended). Set in electron-builder:
  `win.certificateFile` + `CSC_KEY_PASSWORD`, or sign the NSIS `.exe` with
  `signtool`.
- **macOS:** Developer ID Application cert + **notarization**. Set
  `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`; electron-builder
  notarizes via `notarytool`.
- **Linux:** AppImage/deb don't require signing; optionally GPG-sign the repo.

### OTA updates **[needs creds]**
`package.json > build.publish` points at GitHub `civilmantra/agent-client`.
Create that repo, set `GH_TOKEN`, and `electron-builder --publish always`
on tagged releases. Verify `electron-updater` pulls + applies on relaunch.

## 4. Onboarding flow (employee)
1. Admin/lead provisions the employee (UI → Provision Keys / Manage Team) →
   real 8-digit code (shown once).
2. Employee installs the signed agent, opens it, enters corporate email + code,
   grants consent (DPDP) → agent calls `POST /api/activation/verify` → receives a
   device token (stored in OS keyring) + user JWT.
3. Daemon autostarts on login, buffers telemetry locally, syncs to
   `POST /api/ingest` every 30s. Every few active hours the agent prompts
   "what project?" → `POST /api/time-entries` (ROI attribution).
4. Consent withdrawal (in-app) → `DELETE /api/consent` → devices revoked,
   collection halts.

## 5. Clean-VM install verification **[needs VMs]**
Before pilot, on a **fresh** VM per target OS (no Python/dev tools):
- install the signed package, confirm it launches with no SmartScreen/Gatekeeper
  block, the daemon spawns, `/api/status` reports `online`, and telemetry reaches
  the cloud dashboard.

## 6. Pilot gate
One ~25-person team: provision → install → activate → real telemetry +
project attribution visible to their lead and to admin. Monitor ingest health
(`devices.last_seen`), error logs, and ROI numbers for a week before scaling.

---
## Verified locally (not yet in prod)
- Full auth + org + project + activation + ingest + time-entry/ROI chain
  (`npm run test:api` = 23/23; scripted lead→ROI chain = ROI 39 correct).
- Daemon→cloud sync incl. offline buffer + revoke (`npm run test:daemon` = 9/9).
- Bundled daemon binary boots + serves with no system Python.
- Admin + Lead dashboards driving real Postgres data via the browser.

## Still open (tracked in PLAN.md)
Code signing certs, Neon/Vercel provisioning, Win/macOS clean-VM tests, OTA repo,
DPIA sign-off, load test at 1,600 daemons, observability/alerting.
