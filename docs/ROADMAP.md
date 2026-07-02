# ChronoTrack — Final Roadmap & Pilot Readiness

_Last updated: 2026-07-03 — full re-verification pass (real DB, real tests, real build)._

## TL;DR
- **Web platform:** ✅ LIVE in production (Vercel + Neon), fully functional.
- **Linux desktop agent:** ✅ builds, installs, activates, captures real
  telemetry, syncs, autostarts — proven on a real machine.
- **Windows desktop agent:** ⏳ build pipeline ready; needs one build + a clean-VM
  smoke test.
- **Scale:** ✅ 25-daemon stage test passes (0 errors) — **re-verified 2026-07-03
  after fixing a real bug in the test script itself (see below); the test had
  actually been broken/silently-passing-nothing prior to this pass.**
- **Overall: ~90% for a Linux pilot; ~80% for a Windows+Linux pilot.**

---

## 🔍 2026-07-03 verification pass — what was actually checked

Ran every test suite against a real ephemeral Postgres (not mocked), read every
`lib/` and `api/` file, ran `npm run build`, `npm run lint`, `npm audit`. Results:

| Check | Result |
|---|---|
| `npm run build` (vite) | ✅ clean, 667KB bundle (see backlog: code-split) |
| `npm run test:api` (52 backend/RBAC/analytics tests, real Postgres) | ✅ 52/52 pass |
| `npm run test:daemon` (9 e2e tests, real Postgres + real Python daemon) | ✅ 9/9 pass |
| `npm run test:load` (25 simulated daemons, real ingest) | ❌ **was broken**, fixed → ✅ 1800/1800 samples, 0 errors |
| `npm audit --omit=dev` | ✅ 0 vulnerabilities |
| `npm run lint` | ❌ 71 problems → fixed config + real bugs → ✅ 5 left (all cosmetic, documented below) |
| SQL injection / CORS / auth review (`lib/http.js`, `lib/db.js`, `lib/auth.js`, `lib/ratelimit.js`) | ✅ parameterized queries throughout, CORS origin-locked, bcrypt cost 12, JWT verified server-side, per-device rate limiting — no issues found |
| Electron security (`main.cjs`) | ✅ `contextIsolation: true`, `nodeIntegration: false` |

### Bugs found and fixed this pass
1. **`scripts/load-test.js` called nonexistent endpoints** — it POSTed to
   `/api/activation/generate` and `/api/activation/verify`, but the real API
   (merged to fit Vercel's serverless function cap) only exists at
   `/api/activation?action=generate|verify`. Every activation silently 404'd,
   every daemon posted with an `undefined` token, and the load test failed with
   150 straight 401s. **This means the "25-daemon, 0 errors" claim in the prior
   roadmap version was stale/unverified** — the script had been broken since
   whenever `api/activation.js` was merged into a single query-param handler.
   Fixed the two URLs; re-ran: 1800/1800 samples accepted, 0 errors. Real now.
2. **`src/App.jsx` — two temporal-dead-zone hook bugs**, flagged by
   `eslint-plugin-react-hooks`'s `react-hooks/immutability` rule (not previously
   run in CI — see below):
   - `setDesktopActivated` was called from a `useEffect` (line ~385) that ran
     before the `useState` declaring it (line ~861) executed. Safe today only
     because effects fire after the whole render function returns, but fragile
     and a real crash risk under React Compiler or if hook ordering changes.
     **Fixed:** moved the `useState` above the effect.
   - `loadServerData` (a 500-line `const` arrow function) was called from
     `handleAddLead` before its own declaration — same shape of bug, same
     "worked by luck via closures" reasoning. **Fixed:** converted to a hoisted
     `function` declaration so it's genuinely safe regardless of call order.
3. **`eslint.config.js` never applied Node globals to `api/`, `lib/`, `scripts/`,
   or `tests/`** — everything was linted as browser code, so real errors
   (`process is not defined`, `global is not defined`) were invisible/noisy and
   made it easy to miss genuine problems (like #1 and #2 above) in the signal.
   Fixed: server-side dirs now get `globals.node`; `src/` keeps `globals.browser`.
4. **CI (`ci.yml`) never runs `npm run lint`** — only `build` + `test:api`. This
   is why 71 lint problems (including the two real hook-order bugs) accumulated
   unnoticed. **Recommend adding a lint step to CI** (not yet done — flagged,
   not fixed, since it's a CI config change outside this pass's scope).
5. Deleted ~20 unused icon/component imports and 1 fully-dead state variable
   (`newProjColor`) from `src/App.jsx`; removed unused `hashPassword` import
   from `load-test.js`; removed 2 unused `catch (err)` bindings.

### Real gaps found, not fixed (flagged for follow-up)
- **`deployment/schema.sql` is stale.** It predates the migrations system and
  only has 5 of the 11 real tables (missing `projects`, `devices`,
  `activation_codes`, `time_entries`, `consents`, `project_assignments`). The
  actual live schema is `deployment/migrations/001_init.sql` +
  `002_user_profile_fields.sql`, which is what `npm run migrate` applies and
  what this pass verified end-to-end. `PLAN.md` still references
  `schema.sql` as the source of truth — it isn't anymore. Either delete
  `schema.sql` or regenerate it from the migrations so it doesn't mislead
  anyone provisioning a DB by hand.
- **No UI to edit an employee's department after creation** — `newEmpDept`
  state is read (used at creation) but its setter is dead code; there's no
  form control wired to it. Minor, not a blocker.
- **`src/App.jsx` is a 2,965-line single-file component.** Everything (admin,
  lead, employee, landing, auth, desktop-agent UI) lives in one file. Not
  broken, but every future change here carries needless blast radius. Worth a
  decomposition pass before the file grows further — out of scope for this
  verification pass.
- **`npm run test:e2e` (Playwright) and `npm run test:load` at real 1600-scale
  were not run in this pass** — Playwright needs browser binaries not present
  in this environment; load test was only re-verified at N=25 (matching the
  existing documented pilot-scale claim), not at department/company scale.

---

## ✅ Done (in production, tested)
- Secure multi-tenant backend: JWT + bcrypt, RBAC (admin/lead/employee),
  `company_id` isolation, audit trail, rate limiting (per-IP login, per-device ingest).
- Org + projects + activation (hashed single-use codes) + consent (DPDP).
- Real telemetry pipeline: daemon → `/api/ingest`, offline buffer, consent-revoke halt.
- Real analytics + charts: admin overview, daily/category, Contribution ROI ledger,
  TL live board, telemetry feed, immutable audit, productivity rules, employee
  self-dashboard (transparency).
- Self-contained agent (PyInstaller daemon, no Python on target); AppImage + .deb;
  daemon autostart (systemd/Run-key/LaunchAgent) + survives window close.
- Tests: `test:api` 52/52, `test:daemon` 9/9, `test:load` 25 daemons/0 errors
  (all re-verified 2026-07-03 against a real ephemeral Postgres — not stale
  numbers). Playwright e2e specs exist (not re-run this pass — no browser
  binaries in the verification environment). CI + release workflows.
- `npm audit` clean (0 vulnerabilities, prod deps). `npm run build` clean.
- Docs: README, DEPLOY, SETUP-NEON-VERCEL, BUILD-WINDOWS, DEMO-SCRIPT, DPIA-brief.

---

## ⏳ Before handing to Civil Mantra for real-system testing

### Must-do (blockers)
1. **Build the Windows installer** — enable GitHub Actions billing (Settings →
   Billing → spending limit) then run the Release workflow, OR build on a Windows
   VM (`docs/BUILD-WINDOWS.md`). _Est: 1–2h._
2. **Clean-VM smoke test** — fresh Windows VM: install → activate → telemetry
   reaches cloud. Repeat for a clean Linux box. _Est: 1–2h._
3. **Rotate exposed credentials** — the Neon password + JWT secret were shared in
   chat; reset both (Neon dashboard + Vercel env) before real data. _Est: 15m._
4. **Seed real org** — create Civil Mantra's actual admin + ~5 team leads; remove
   test accounts. _Est: 30m._

### Strongly recommended (before wider than pilot)
5. **Code-sign installers** — Windows Authenticode (avoids SmartScreen "unknown
   publisher"); macOS notarize if Mac used. _Needs a cert (~₹/$ per year)._
6. **DPIA sign-off** — counsel answers the 7 questions in `docs/DPIA-brief.md`;
   finalize consent-notice wording + retention period. _Legal, in progress._
7. **Data retention policy** — auto-prune raw telemetry after N days (cron).

---

## 🗺️ Phased rollout
- **Phase A — Pilot (25 employees, 1 team):** items 1–4 above → install on real
  Win/Linux machines → 1 week of real data → review analytics with the lead/admin.
- **Phase B — Department (~100):** items 5–7 → add observability/alerting
  (ingest health, `last_seen` dashboard) → load test at 100.
- **Phase C — Company-wide (1,600):** managed rate-limit store (Redis) instead of
  in-memory; DB partitioning/indices review; OTA auto-update; on-call runbook.

---

## 🔭 Product backlog (post-pilot polish)
- ~~**Classifier from rules**~~ — **already done, this pass corrected the stale
  claim.** `/api/ingest` returns the company's whitelist/blacklist
  (`api/ingest.js:62-71`) and the daemon caches + applies it
  (`src-daemon/telemetry_daemon.py:261-402`, `RULES_CACHE`). Verified by reading
  the code; not just re-stating a prior note.
- **Employee web login:** employees currently activate in-agent; add a web login
  + personalized download page + web self-dashboard.
- **Hourly "since-login" timeline:** backend hourly trend shipped; surface it as a
  per-hour chart in the agent (today daily chart in place).
- **AI insights:** burnout/idle-pattern detection, anomaly tuning (current rule is
  a coarse off-hours + threshold check).
- **Notifications:** richer in-agent prompts; manager weekly digest email.
- **Integrations:** payroll/HR export, Jira/Git activity signals.

---

## ⚠️ Known limitations (be transparent with the client)
- Installers are **unsigned** → OS "unknown publisher" warning until signed.
- Rate limiting is **in-memory per serverless instance** (fine for pilot; use
  Redis at company scale).
- Anomaly detection is **rule-based**, not ML — needs tuning on real data.
- Wayland Linux sessions: window-title capture is limited (X11 fully supported).
- **`deployment/schema.sql` is stale** (5 of 11 tables) — real schema is the
  migrations in `deployment/migrations/`. Don't provision a DB from
  `schema.sql`; use `npm run migrate`. See "real gaps found" above.
- **CI does not run `npm run lint`** — only build + `test:api`. Real bugs (two
  TDZ hook-order issues) sat undetected in `src/App.jsx` until this pass.
  Recommend adding a lint step to `.github/workflows/ci.yml`.
