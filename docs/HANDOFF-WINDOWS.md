# Handoff — continue + test on Windows

Pick this up on a Windows machine. All work is committed and pushed to `main` on
GitHub — nothing is stuck on the Linux side. When you're done testing/repairing on
Windows, come back to Linux and `git pull` to continue.

**Repo:** https://github.com/harsh-pandhe/ChronoTrack.git
**Branch:** `main`
**Latest commit at handoff:** `aee32ec` — clean, pushed, `git status` empty.
**Live web app:** https://chrono-track-tau.vercel.app (auto-deploys from `main`).

---

## 0. What state everything is in

All six planned phases are DONE, pushed, and live:

| Phase | What | Commit |
|---|---|---|
| 1 | Time-entry integrity (assignment gate, overlap + daily-ceiling checks) + multi-project cross-lead assignment | `275599a` |
| 2 | Employee visual timeline allocation (tag tracked blocks → projects) | `fcaed2a` |
| 3 | Reporting depth (per-employee/project drill-down, team idle/apps, per-lead cross-tab) | `26260b0` |
| 5 | Security/scale (shared rate-limit, JWT rotation, device expiry + per-device revoke, ingest backpressure, daemon watchdog) | `339a707` |
| 6 | Stress + e2e (latency percentiles, CI lint, load test) | `424e6f4` |
| 4 | Light-first UI redesign across all roles (shadcn/ui infra + theme + full semantic-token sweep) | `7ef4266` |

Verified: backend `npm run test:api` = **73/73**; build clean; load test = 120
daemons → 79× 503 shed, 0 hard errors; admin/lead/landing render light + dark with
zero white-on-white; live site HTTP 200 serving the new build.

**Still open (tech-debt, NOT blocking testing):**
- Migrate tables/forms to the `src/components/ui/*` shadcn primitives (they exist,
  most screens still use inline Tailwind).
- Decompose `src/App.jsx` (~3.4k lines) into lazy `src/routes/*` + code-split
  (still one ~720 KB JS chunk).
- Delete dead code: `DEMO_MODE` simulator, client-side `logAudit`, unused `logs`
  state → drives lint from 54 → 0, then flip the CI `lint` job to blocking
  (remove `continue-on-error` in `.github/workflows/ci.yml`).
- macOS daemon real-input parity; rebrand from "Civil Mantra"; delete stale
  `deployment/schema.sql`.

---

## 1. Install prerequisites (once)

- [Node 22](https://nodejs.org) (`node -v` ≥ 22)
- [Python 3.12](https://python.org) — tick **Add to PATH** (needed only to build the
  daemon locally; the shipped `.exe` bundles it)
- [Git](https://git-scm.com), and optionally [GitHub CLI](https://cli.github.com)
  (`gh auth login`) to trigger Actions builds from the terminal
- [Docker Desktop](https://docker.com) — only if you want to run the local test DB

## 2. Get the code

```powershell
git clone https://github.com/harsh-pandhe/ChronoTrack.git
cd ChronoTrack
git checkout main
git pull
npm install
```

---

## 3. Testing the DESKTOP AGENT on Windows (the main reason you're here)

The agent `.exe` is built by GitHub Actions (Windows runner) — you do NOT build it
locally.

1. **Get the installer.** A build already exists:
   `https://github.com/harsh-pandhe/ChronoTrack/actions/runs/29210000078`
   → scroll to **Artifacts** → download **windows-installer** → unzip → run the `.exe`.
   To make a fresh build from the latest `main`: `gh workflow run release.yml --ref main`
   (or the Actions tab → Release → Run workflow), wait ~10–15 min, download the new
   artifact.
2. **SmartScreen** will warn "unknown publisher" (build is unsigned) →
   **More info → Run anyway**. Expected.
3. **Install and launch.** The app is the employee agent; it spawns a hidden Python
   telemetry daemon (local HTTP on `127.0.0.1:5050`) and registers autostart.
4. **Activate it.** You need an activation code:
   - Go to https://chrono-track-tau.vercel.app, log in as **admin**, → **Provision
     Keys**, generate a code for an employee (make the employee first under **User
     Directory** if needed). Code shows once.
   - In the agent: enter that employee's email + the code, grant consent, activate.
5. **Run the checklist:** `docs/WINDOWS-TEST-CHECKLIST.md`. Cover: daemon starts
   hidden, telemetry syncs (Cloud Sync panel goes green), the **timeline allocation**
   works (tracked blocks appear → tag one to a project → it saves), consent revoke
   stops collection, Exit Agent closes the window but the daemon keeps running,
   reboot/autostart survival.

### Watching what the daemon does
- Logs: `%APPDATA%\civil-mantra\data\daemon.log`
- Local DB (buffered telemetry): `%APPDATA%\civil-mantra\data\telemetry.db`
- Config/token: `%APPDATA%\civil-mantra\config.json`
- New this round: device tokens now **expire** (180d) and the Electron app runs a
  **watchdog** that respawns the daemon if it dies (matters on Windows — the Run-key
  doesn't restart on crash). If you kill the daemon, the app should bring it back
  within ~90s.

---

## 4. Testing the WEB app (admin / lead) — no install

Just a browser against the live site: https://chrono-track-tau.vercel.app

- It's **light-first** now (toggle to dark in the UI; choice persists).
- Log in as admin → exercise: User Directory (create lead/employee, assign to
  projects — an employee can be on multiple projects across leads now), Contribution
  ROI, Provision Keys, Productivity Rules, Immutable Audit.
- Log in as a **lead** → Team Live Board, Telemetry Logs (per-employee × per-project
  hours drill-down + team idle/most-used apps), Manage Team & Projects.
- Things to confirm: logging time only works against an **assigned** project;
  overlapping / over-daily-ceiling time entries are rejected; the per-lead
  "Portfolio by Team Lead" table on the admin dashboard shows real numbers.

---

## 5. Clean out old test accounts / projects (destructive)

A guarded script wipes all non-admin users + all projects (cascade removes their
telemetry/time/devices/consents), keeping your admin login + company:

```powershell
# Get the prod DB URL from Vercel (Project → Settings → Environment Variables →
# DATABASE_URL), then:
$env:DATABASE_URL="<your-neon-prod-connection-string>"
$env:CONFIRM="RESET"
node scripts/reset-data.js
```
Neon needs SSL — do **not** set `PGSSL=disable` for prod. Without `CONFIRM=RESET` it
refuses to run. (Verified on the Linux test DB: removed 182 users + 40,788 telemetry
rows, kept the admin.) Alternatively delete per-item in the live admin UI.

---

## 6. Running the full stack LOCALLY on Windows (optional, for dev/repairs)

```powershell
# 1. Local Postgres (throwaway)
docker run -d --name ct_pg -e POSTGRES_PASSWORD=test -e POSTGRES_DB=chronotrack -p 5544:5432 postgres:16-alpine

# 2. Env for this shell
$env:DATABASE_URL="postgres://postgres:test@localhost:5544/chronotrack"
$env:PGSSL="disable"
$env:JWT_SECRET="dev-secret-change-me"

# 3. Schema + first admin
npm run migrate
$env:COMPANY="Civil Mantra"; $env:ADMIN_EMAIL="admin@cm.com"; $env:ADMIN_PASSWORD="admin-strong-pass"
npm run seed:admin

# 4. Backend API (leave running) + web (new terminal)
$env:API_PORT="3031"; node scripts/dev-api.js
#   new terminal:
$env:VITE_API_BASE="http://localhost:3031"; npm run dev   # http://localhost:5173

# 5. Run the agent against local (dev mode, runs the .py directly — needs Python):
npm run electron:dev
```

### Tests
```powershell
npm run test:api      # 73 backend/RBAC/integrity checks (needs the docker Postgres)
npm run build         # SPA build (should be clean)
npm run lint          # 54 known pre-existing errors in App.jsx — that's the baseline
npm run test:load     # stress: set $env:N, DURATION, INTERVAL (see scripts/load-test.js)
```

---

## 7. Known issues / gotchas

- **Lint baseline = 54 errors**, all in `src/App.jsx` (unused imports + a couple
  hooks warnings). CI's `lint` job is intentionally non-blocking until the cleanup
  above lands. A clean `npm run lint` is NOT expected yet.
- **`node_modules` can vanish** in ephemeral environments — if `vite: not found` or
  `eslint` can't find config, just `npm install` again.
- **Single JS chunk ~720 KB** — build warns about chunk size; harmless, fixed by the
  code-split follow-up.
- **Unsigned installer** → SmartScreen warning (see §3.2). Code-signing is a future
  step (`WIN_CSC_LINK`/`WIN_CSC_KEY_PASSWORD` secrets wired in `release.yml`).
- **Standing security TODO (owner action):** rotate the Neon DB password and set a
  fresh `JWT_SECRET` in Vercel (rotation is now zero-downtime — set the old value as
  `JWT_SECRET_PREVIOUS` during the switch), then redeploy.

---

## 8. Coming back to Linux

Whatever you commit + push from Windows, back on the Linux box just:
```bash
cd ~/GitHub/ChronoTrack && git checkout main && git pull
npm install   # in case node_modules is stale
```
The full plan lives at `docs/ROADMAP.md`; this session's plan file (Phase 4 detail)
is at `.claude/plans/ancient-waddling-iverson.md` on the Linux machine.
