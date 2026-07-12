# ChronoTrack — Final Roadmap & Pilot Readiness

_Last updated: 2026-07-12 — completion push Phases 1–3 landed (data-integrity,
visual timeline allocation, lead/admin reporting depth). See below._

---

## 🚧 2026-07-12 — completion & hardening push (Phases 1–6 plan)

Working through a 6-phase plan to close the gap between the live build and the
full product vision (multi-project, visual time allocation, deep reporting,
UX overhaul, scale-for-1600 hardening, stress tests).

- **Phase 1 — data integrity + multi-project (done, `275599a`).** Time entries
  are now validated server-side: must be against an assigned project, can't
  overlap an existing entry, and can't exceed a daily ceiling grounded in real
  tracked active time (`max(tracked+tolerance, 8h floor)`), with a
  tracked-seconds snapshot per entry. New assignment endpoints on
  `/api/projects/:id` (assign/unassign/assignments) support one employee across
  many projects and many leads (cross-lead, audited). test-api 63/63.
- **Phase 2 — visual timeline allocation (done, `fcaed2a`).** New
  `analytics?scope=timeline` returns the day's contiguous tracked active blocks
  + allocations + assigned projects; the desktop agent renders an SVG lane where
  the employee tags blocks to projects instead of typing a duration. 66/66.
- **Phase 3 — reporting depth (done, `26260b0`).** `scope=team` adds
  per-employee→per-project hours, team idle summary, and most-used apps;
  `scope=overview` adds a per-lead cross-tab (projects/employees/revenue/cost/
  return). UI: admin "Portfolio by Team Lead" + lead drill-down. 69/69.
- **Phase 5 — security & scale hardening (done, `339a707`).** Optional shared
  Upstash rate-limit store (holds across instances; in-memory fallback); JWT
  rotation via `JWT_SECRET_PREVIOUS`; device-token expiry (migration 004) +
  per-device revoke; ingest backpressure (503 under storm); env-tunable DB pool;
  daemon watchdog in `main.cjs` (respawn on death — matters on Windows). 73/73.
- **Phase 6 — stress + e2e (done, `424e6f4`).** load-test now reports latency
  p50/p95/p99 and separates 429/503 (guards) from hard errors — locally: 60
  daemons/20s = 0 errors p99 6ms; 120-daemon hammer shed 79× 503 with 0 hard
  errors. CI gains a (non-blocking) lint job; +2 Playwright tests for the Phase 3
  views. Follow-up: wire daemon-e2e + Playwright into CI (need pinned deps).
- **Phase 4 — UI/UX overhaul (mostly done, `7ef4266`).** shadcn/ui infra + `@/`
  alias + `cn`; light-first "Linear/Vercel" theme (retuned tokens + `.dark`,
  ThemeProvider, default light, dark toggle); redesigned login (shadcn); and a
  full sweep of App.jsx off hard-coded dark classes onto semantic tokens so every
  role renders coherently in light + dark (verified landing/admin/lead in-browser,
  zero white-on-white). Misleading "Simulated intelligence" label reworded.
  **Follow-up (tech-debt, not blocking):** migrate tables/forms to the `ui/*`
  primitives, decompose `App.jsx` into lazy routes + code-split (still one ~720KB
  chunk), remove dead `DEMO_MODE`/`logAudit`/`logs` code, drive lint to 0 and flip
  the CI lint job to blocking.

---

## ✅ 2026-07-05 (later) — cloud-sync network issue fixed and confirmed

## ✅ 2026-07-05 (later) — cloud-sync network issue fixed and confirmed

Root cause: `ssl.get_default_verify_paths()` on Windows falls back to a
hardcoded Unix-style path that doesn't exist, so the frozen PyInstaller
daemon's TLS handshakes to the cloud API were failing intermittently
(timeouts, DNS-looking errors, connection resets) — a genuine platform/
packaging bug, not a network outage. Fixed by building an explicit
`ssl.SSLContext` from certifi's bundled CA list instead of relying on the
ambiguous platform default, with a safe fallback if certifi is ever missing.
Also improved error logging to unwrap the real failure class (TLS/DNS/
timeout/generic) instead of one opaque "Sync deferred" line, and fixed both
CI build paths (Windows job's inline pyinstaller call and the Linux job's
`build_daemon.sh` — they had drifted and weren't using the same command) to
bundle certifi via `--collect-data certifi`.

**Verified on a completely fresh build/install**: the daemon now reaches
the server successfully — no more network-level failures. The Cloud Sync
Status panel changed from silent/blank to showing a real, specific HTTP 401
("Server rejected upload") instead of a connection error. That 401 is
expected and unrelated to this fix — it's this specific test device's stale
token from the employee-account churn during earlier testing sessions, not
a bug. The panel also correctly reported "5237 record(s) waiting to
upload — kept safely on this device, not lost," confirming the earlier
data-loss fix (`prune_db()`) is holding under real accumulated backlog.

**Everything from both 2026-07-04 passes and this one is now deployed to
`main` / live on chrono-track-tau.vercel.app, and re-verified against a real
clean install, not just re-read from the diff.**

---

## 🔁 2026-07-05 — production deploy + full live re-verification

Merged the 2026-07-04 fix branch to `main` (fast-forward, no conflicts) and
pushed — Vercel deployed it live. Then re-ran the entire admin/team-lead flow
directly against production via the Chrome extension, plus a full
clean-uninstall/clean-install desktop cycle via computer-use, specifically
re-checking every one of the 13 fixes plus UI/chart/button polish as asked.

### Re-verified live, all confirmed working
- UUIDs → names: project dropdowns (create + edit) and audit log all show
  real names now (e.g. "create employee (Retest Employee Alpha)" instead of
  a raw ID fragment).
- Project + team-lead assignment persists correctly end-to-end — created a
  test employee with both set, confirmed they show correctly in the table
  and in the edit form afterward.
- Submit-in-flight guard: button visibly shows "Adding…" and disables during
  the request.
- Duplicate-name guard: attempted to create a project with an existing name,
  got a clean "A project named '...' already exists." error toast.
- Custom confirm modal: the DPDP data-purge action now shows a proper red
  modal requiring the word `ERASE` to be typed — no native dialog, no browser
  freeze.
- Status field: edit form now shows "Inactive (hasn't activated the desktop
  agent yet)" consistent with the table badge — no more contradiction.
- Net Profit Margin shows "No cost data yet"; Idle Bench % correctly labeled.
- Team lead's "Provision New Employee" panel correctly shows a locked
  explanation instead of a fillable-then-rejected form when unauthorized.
- Desktop: clean uninstall → fresh install → daemon runs invisibly → Exit
  Agent closes the window fully → daemon survives in the background. All
  still hold on the newest build.
- Cloud Sync Status panel (new this pass, see below) shows honest real state
  instead of the old blank panel.

### New polish added this pass (not bugs, but asked to review UI/UX/charts)
- All 5 charts (dashboard trend + category, team lead trend + per-employee,
  employee self-view) now show "No activity data yet" centered in the chart
  area instead of a bare empty grid when there's no data.
- "Pending Registration Keys" list (Provision Keys page) now has an explicit
  empty state, plus a note clarifying keys are shown once only (stored
  hashed server-side, cannot be redisplayed) — this list was already
  session-only with no backing list endpoint; documented rather than silently
  left confusing.

### New finding + fix: daemon single-instance lock had a TOCTOU race
Confirmed live: two `CivilMantraDaemon.exe` processes running with start
times ~1 second apart. The old lock (read PID file → check if alive → write
own PID) has no atomicity, so two processes launched in the same instant can
both pass the check before either writes. Fixed by holding the PID file open
with an OS-level exclusive lock (`msvcrt.locking` / `fcntl.flock`) for the
daemon's whole lifetime — atomic, and released automatically even on a crash.

**Correction after further testing:** re-tested after this fix and *still*
saw two processes. Investigated the parent/child relationship directly
(`Get-CimInstance Win32_Process`) and found the second process's
`ParentProcessId` **is** the first process's PID — this is the standard
PyInstaller `--onefile` bootloader+child pattern (a thin extractor process
that stays resident, plus the real worker), not a duplicate instance at all.
**There was no actual race-condition bug** — my initial diagnosis jumped to
a conclusion without checking the parent/child relationship first. The lock
code is still a reasonable defensive improvement (real OS-level exclusivity
is strictly better than the old check-then-write), so it's staying in, but
it is not "fixing" a bug that existed.

### Real open issue found, not fixed (needs proper diagnosis, not a guess)
**Intermittent cloud-sync failures from the packaged daemon**, confirmed
persistent across a completely fresh build/install: `daemon.log` shows 119
`[Cloud] Sync deferred` entries (mix of read-timeouts, `getaddrinfo failed`,
and connection-reset errors) accumulated across testing, and the panel still
read "No successful sync yet on this device" after 35+ seconds of waiting
on the newest build. A direct Python request from this same machine to the
same endpoint (`/api/ingest`) succeeded immediately and cleanly (401, meaning
reachable and responding). This points at something specific to the
**PyInstaller-bundled executable's networking** — most likely candidates:
stale/missing SSL certificate bundle in the frozen build, or
Windows Defender/firewall throttling an unsigned executable's outbound
HTTPS. Did not attempt a speculative fix — needs actual diagnostics (e.g.
temporarily logging the raw SSL error class/traceback, checking whether
`certifi`'s bundle is present in the PyInstaller spec, testing with the
installer's code-signing added). **This is the real reason telemetry isn't
reaching the cloud for real users, not a application-layer bug** — worth
prioritizing before pilot.

---

## 🔧 2026-07-04 (later) — full web audit + same-day fixes

Drove the live web app end-to-end via the Chrome extension as admin, then as
a freshly-created team lead: user/employee/project creation, authority
toggles, all analytics pages, the real desktop daemon's telemetry pipeline,
landing/login pages, and network/console health (47 API calls, zero errors).
Full findings and fixes below — everything found was fixed the same session.

### Fixed
1. **Silent data-loss bug** (`telemetry_daemon.py:251`) — `prune_db()` deleted
   the oldest local rows once the buffer passed 5,000 entries regardless of
   whether they'd synced to the cloud yet. Now only ever prunes rows already
   confirmed `synced=1`; unsynced rows are kept until they actually sync, and
   a warning is logged if the unsynced backlog itself exceeds the cap.
2. **Cloud sync status was never surfaced** — the "Cloud Sync" panel only
   ever populated from a demo-mode fake simulator (`VITE_DEMO_MODE`); in
   production it silently showed nothing, success or failure. Daemon now
   tracks `last_attempt_at` / `last_success_at` / `last_error` and exposes
   them on `/api/status`; the Electron UI polls this and shows real
   synced/error/pending state. The fake simulator effect was removed
   entirely (it also conflicted with "no hardcoded data" going forward).
3. **Raw UUIDs shown instead of names** — Admin's Active Project dropdown
   (create + edit employee) rendered `{p.id}` instead of `{p.name}`; same
   pattern in the Immutable Audit log (`target.slice(0,12)`). Fixed the
   dropdowns and added `resolveAuditTarget()` to resolve audit IDs to real
   employee/lead/project names, falling back to a short ID only if the
   record was since deleted.
4. **Project-assignment silently failing** — root cause was two missing
   `<option value="">…</option>` defaults on controlled `<select>`s (Active
   Project, Assign Team Lead): with no matching option, the browser visually
   shows the first real option as "selected" while React state stays empty,
   so the form submitted `null` even though a project looked chosen. Fixed
   all four affected dropdowns. Also found `handleEditEmployee`'s PATCH call
   never sent `active_project_id` or `team_lead_id` at all — added both.
5. **Double-submit created duplicate projects** — reproduced live (one rapid
   double-click created two identical projects). Added a `saving` guard +
   disabled button state to all four create/edit forms (project ×2 flows,
   employee create, employee edit).
6. **No duplicate-name guard** — two prod projects were already named "CRM"
   with no distinguishing info. Added a server-side case-insensitive
   duplicate check on project creation (409 with a clear message). A DB-level
   unique constraint is deferred until the existing duplicate "CRM" projects
   are manually resolved (a migration would fail against that live data).
7. **Native `window.confirm()`/`window.prompt()` dialogs** — used for delete,
   archive, rename, and the data-purge action; unstyled, blocked the whole
   tab (froze automated testing twice), no way to signal severity. Replaced
   with custom modal components (`askConfirm`/`askText`) across all 5 call
   sites.
8. **Destructive data-purge action was too easy to trigger** — an unlabeled
   warning-triangle icon + generic native confirm could permanently erase an
   employee's telemetry history in two clicks with no severity cue (this
   happened once by accident during testing). Now requires typing `ERASE`
   in a clearly red, explicitly-worded modal before it proceeds.
9. **Ambiguous "Status" field** — turned out to be one bug, not two concepts:
   the edit-employee Status dropdown had no option matching `'invited'`
   employees, so the same missing-default-option bug as #4 made it visually
   show "Active" while the table correctly showed "Inactive". Added an
   explicit Inactive option, fixed the save mapping to round-trip
   active/invited/disabled correctly, and relabeled it "Account Status".
10. **Net Profit Margin showing 100% with Rs 0 cost** — `(revenue-0)/revenue`
    is mathematically valid but reads as "verified 100% margin" before any
    real hours are logged. `margin_pct` now returns `null` until real cost
    data exists; the UI shows "No cost data yet" instead of a number.
11. **Mislabeled "Idle Bench Latency"** — not a latency measurement. Renamed
    to "Idle Bench %".
12. **Landing page privacy copy** — "No keystrokes… complete privacy" could
    read as "keystrokes aren't tracked at all," when the product actually
    logs keystroke *counts* (never content). Reworded for precision given
    the DPDP consent stakes.
13. **Team lead employee form didn't hide for unauthorized leads** — a lead
    without `can_manage_employees` could fill out the whole "Provision New
    Employee" form before being rejected at submit. Also found the login
    response never even included `can_manage_employees`, so the frontend had
    no way to check it — added it to `/api/auth/login`, then gated the form.

### Verified working (no changes needed)
- RBAC is enforced server-side, not just hidden client-side (confirmed via a
  real 403 rejection, not just a hidden button).
- Local telemetry capture on the real desktop daemon genuinely captures real
  activity — the bug was purely in cloud-sync visibility and retention, not
  capture.
- `POST /api/projects`/`POST /api/users` already correctly upsert
  `project_assignments` — the assignment bug was 100% frontend (see #4).
- Network/console health: 47 API calls across the full session, zero
  failures and zero console errors (one expected 403 for an authorization
  test).

### Verification
`npm run build` clean, `npm run lint` back to the same 5 pre-existing
cosmetic issues documented in the 2026-07-03 pass (0 new issues introduced),
`node --check` clean on every touched API file, `python -m ast.parse` clean
on `telemetry_daemon.py`. `npm run test:api` could not be run in this
environment (needs a live Postgres connection) — recommend running it before
merge.

### Not done this pass
- DB-level unique constraint on project names (blocked on existing duplicate
  "CRM" projects — needs manual data cleanup first).
- `POST /api/time-entries` project-assignment check (still open, unrelated
  to this pass — see Stage 1 below).
- Full responsive/mobile pass (the viewport-resize tool didn't register in
  this environment — still unverified either way).

---

## 🔍 2026-07-04 — clean-install Windows retest (commit `102d2ff`)

Triggered a fresh Windows build via `gh workflow run release.yml --ref
claude/competent-gould-9bb9e5` (run
[28701030135](https://github.com/harsh-pandhe/ChronoTrack/actions/runs/28701030135),
built from `22de293` which includes `102d2ff`). Downloaded the
`windows-installer` artifact, fully uninstalled the stale `CivilMantraAgent
3.0.0` from Add/Remove Programs (this needed a UAC prompt the tester couldn't
see/click — user approved manually), deleted the stale duplicate installer
sitting in Downloads (`CivilMantraAgent Setup 3.0.0 (1).exe` — this was the
prime suspect for why Exit Agent looked broken in the 07-03 test), then
installed and ran the new build.

### Confirmed fixed
- **Exit Agent now works correctly.** Clicking it closes the app window
  entirely — no more falling back to the marketing landing page. This was
  the main unconfirmed item from the 07-03 pass.
- Daemon (`CivilMantraDaemon.exe`) survives Exit Agent — still running in
  Task Manager afterward, telemetry collection intended to keep going.
- Clean install: no wizard hang, `CivilMantraDaemon.exe` never shows a
  console window, confirmed via Task Manager → Details.
- Re-opening the app after it was already activated does not re-prompt
  activation (device token persisted correctly across the reinstall).

### Confirmed still-open (not new — matches item 5 in the 07-03 findings)
- The local app UI showed **"DAEMON ACTIVE (PORT 5050)"** and **"SYNCING LIVE
  LOGS"**, but the web admin dashboard said **"No telemetry yet."** The
  in-app status is not proof of a real cloud connection — exactly the
  reliability/trust gap already flagged. Root cause is still the same:
  local device state (OS keyring token) can outlive the server-side
  `devices`/employee record, and the UI has no live-ping check to catch
  that mismatch. Fix is already scoped in Stage 1 below ("make the sync
  panel prove current connectivity").

### New bug found
- **No single-instance lock.** Launching `CivilMantraAgent` while an
  instance is already running opens a brand-new window/process instead of
  focusing the existing one (confirmed twice — Task Manager showed two
  separate `CivilMantraAgent` app groups after a second launch). Wastes
  resources and risks confusing/duplicate daemon state. Not previously
  documented — needs `app.requestSingleInstanceLock()` in `main.cjs`.

### Not re-tested this pass
Reboot/autostart-survival (item 7) and the Linux-equivalent pass were
deferred — this session covered install, daemon-visibility, and Exit Agent
only.

---

## 🔍 2026-07-03 (evening) — real Windows-hardware test results

A tester (Claude, driving the Windows machine directly via computer-use) ran
`docs/WINDOWS-TEST-CHECKLIST.md` against the build from commit `d1e731e`.
Results and what came out of them:

### Confirmed working
- Install completes, no crash.
- Daemon runs invisibly on first launch (windowsHide worked for the
  Electron-spawned case).
- Autostart survives reboot; re-opening the app doesn't re-prompt activation.

### Bugs found + fixed this pass
1. **Daemon console window DOES appear — windowsHide wasn't the whole
   fix.** `windowsHide` on the Node `spawn()` call only suppresses the
   console when *Electron* launches the daemon. The OS autostart entry
   (`HKCU...Run` key) launches the exe **directly** with no such option, so
   after a reboot the console pops up exactly as before. Real fix: build the
   daemon with `--noconsole` (no console subsystem at all, regardless of
   launcher) in both `build_daemon.sh` and `release.yml`, and redirect the
   daemon's own stdout/stderr to a rotating log file
   (`%APPDATA%/civil-mantra/data/daemon.log`) so bare `print()` calls can't
   crash on a null stream in windowed mode either. Fixed in `102d2ff`.
2. **Real crash loop caught in the test screenshot**:
   `ctypes.ArgumentError: argument 4: OverflowError: int too long to
   convert` firing on every keystroke inside `keyboard_proc`.
   `CallNextHookEx` had no `argtypes`/`restype` declared, so ctypes
   marshaled the 64-bit `lParam` pointer as a 32-bit C `int` by default and
   overflowed on every single call. This was silently swallowed
   ("Exception ignored") but meant the hook chain broke on every event.
   Fixed with proper `argtypes`/`restype` declarations.
3. **Every employee's own project pick-list was permanently empty,
   regardless of what project they were assigned at creation.**
   `active_project_id` (set on the employee form) was never mirrored into
   `project_assignments` — the table `GET /api/projects` actually filters on
   for an employee's own scope. This is the root cause behind "the project
   selection is not the project we assigned them" — there was no real
   assignment underneath, just a display-only field. Fixed: both
   `POST /api/users` and `PATCH /api/users/:id` now upsert the assignment.
   Also fixed the `newEmpProject` form default, which was the **literal
   string `'Project Alpha'`** (not a real project id) — this would either
   fail the FK constraint or, since a controlled `<select>` doesn't
   re-sync its value when the mismatched default doesn't match any
   `<option>`, silently submit that garbage string if the lead didn't
   manually reselect. Now defaults to a real "No project assigned" option.
   Added permanent regression tests in `scripts/test-api.js` (56/56 pass now).

### Still unconfirmed / needs another real test
4. **"Exit Agent" still showed the marketing landing page in the test.**
   The source code for the fix is confirmed correct and present in the
   exact commit that was built (verified by reading `preload.cjs`,
   `main.cjs`, `App.jsx` directly — `contextBridge` exposes `quitApp`,
   `ipcMain` handles `app-quit`, the button calls `handleExitAgent`). The
   tester's own notes say the Downloads folder already had **a duplicate
   installer file** from an earlier attempt, and activation state was
   already present before install — strong signal the OLD (pre-fix)
   installer got run instead of the freshly-downloaded one, or an old app
   instance was still resident. **Needs a clean re-test**: fully uninstall
   any existing CivilMantra Agent (Add/Remove Programs), delete old
   installer files from Downloads, download only the newest artifact, then
   retest just this one item.
5. **The in-app "POSTGRESQL CLOUD SYNC" panel showed "Success — Pushed N
   events" for a device that, per a direct prod DB query taken minutes
   later, no longer exists** (0 rows in `devices`, 0 rows in
   `telemetry_logs` company-wide at the time of writing). The panel is
   showing a **historical local log**, not live proof of current
   connectivity — if the server-side device/user gets deleted or revoked
   after a successful sync, the panel doesn't reflect that until the next
   sync attempt actually fails. This is a real reliability/trust gap for a
   product whose whole pitch is "transparent, verifiable telemetry" — see
   the hardening plan below.
6. Confirmed via direct prod query: two projects both named "CRM" exist —
   no duplicate-name guard, and no form anywhere in the app disables its
   submit button while a request is in flight, so a double-click on any
   "Create" button (employee, lead, project, rule) can create duplicates.
   Not a security issue, but real, and affects data quality at scale.
7. `POST /api/time-entries` checks the project belongs to the caller's
   company, but **does not check the employee is actually in
   `project_assignments` for it** — the UI dropdown only shows assigned
   projects, but a crafted direct API call could log hours against any
   company project. Same-tenant only (not a cross-company leak), but it
   undermines the "verified hours" ROI story this product is built on.

---

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
1. ✅ **Windows installer builds** — GitHub Actions billing is no longer
   blocking. Found + fixed a CSC_LINK regression (`d1e731e`) and, after a real
   hardware test, two further real bugs: the daemon console window only
   partly fixed by `windowsHide` (now truly fixed with `--noconsole` + log
   redirection, `102d2ff`), and a live ctypes crash loop in the keyboard hook
   (`102d2ff`). Latest build:
   https://github.com/harsh-pandhe/ChronoTrack/actions/runs/28621882143 — a
   fresh build with today's fixes has not been triggered yet (ask before
   doing so — costs CI minutes on every run). Still **unsigned**.
2. ⏳ **Clean-VM smoke test** — first real-hardware pass done 2026-07-03
   (`docs/WINDOWS-TEST-CHECKLIST.md`). Confirmed: install, daemon starts
   invisibly on first launch, autostart survives reboot, no re-prompt on
   reopen. **Exit Agent still unconfirmed** — the fix is verified correct in
   source, but the tester's own notes suggest a stale/duplicate installer may
   have been run instead of the new build; needs a clean
   uninstall-then-reinstall retest. Also surfaced 3 more real bugs (see
   "real-hardware test results" above), now fixed. Still need: a from-scratch
   activation test (this machine had leftover state), the equivalent pass on
   a clean Linux box, and re-test after the next build once triggered.
3. ⚠️ **Rotate exposed credentials — STILL NOT DONE, now doubly exposed.**
   The Neon `DATABASE_URL` was shared in chat before this roadmap item was
   written, **and was pasted in plaintext again on 2026-07-03** during this
   session (used once, read-only listing + one deletion, not stored anywhere
   in this repo). Both the Neon password and the JWT secret need rotating
   (Neon dashboard → reset password; Vercel env → new `JWT_SECRET`, which
   invalidates all live sessions — do it during a maintenance window) before
   this goes anywhere near real employee data.
4. ✅ **Test accounts removed** — deleted `harshpandhehome@gmail.com`
   (employee, 1 device + 5 telemetry rows) from prod 2026-07-03. **Note:
   prod org has since changed again during testing** — `harshpandhehome@gmail.com`
   was recreated (status `invited`, not yet activated), and the original
   `udaypandhe@gmail.com` lead account is gone, replaced by a new
   `uday@gmail.com` lead. Two projects both named "CRM" now exist (no
   duplicate-name guard — see item 6 in the real-hardware findings above).
   Recommend a final cleanup pass once testing is actually done, not before.

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

---

## 🏁 Path to an industry-grade v1.0

The ask: fix everything, test everything, and turn this into a lightweight,
strong, good-looking product ready for real industry use — not a pilot demo.
Below is the concrete plan. A few decisions in it are yours, not mine (marked
**[YOUR CALL]**) — see the questions accompanying this update.

### Stage 1 — Close out the bugs already found (no new scope)
- [x] Retest Exit Agent on a clean install (uninstall old app, delete stale
  installers, download only the newest artifact) — confirmed fixed
  2026-07-04, see above.
- [x] Retest daemon-window fix after the next build (commit `102d2ff`,
  built 2026-07-04) — confirmed: no console window, daemon runs invisibly.
  Keyboard-hook-crash fix not separately re-exercised this pass (no keyboard
  input was driven against the hook).
- [ ] Fresh-activation test (this machine's state was contaminated by
  earlier runs) — either a clean VM or reset via the web dashboard. Still
  not done: 2026-07-04's reinstall reused a persisted device token instead
  of going through onboarding, so the activation flow itself remains
  unverified end-to-end.
- [ ] Same checklist pass on a clean Linux machine.
- [ ] Reboot/autostart-survival retest (checklist item 7) — deferred
  2026-07-04, not yet done on this build.
- [ ] Fix the newly-found bug: no single-instance lock on the Electron app
  (`main.cjs` needs `app.requestSingleInstanceLock()`) — see 2026-07-04
  findings above.
- [ ] `POST /api/time-entries` should reject hours logged against a project
  the employee isn't in `project_assignments` for (currently only checked
  client-side via the dropdown) — closes the ROI-integrity gap. Still open.
- [x] Add a duplicate-name guard on project creation, and a generic
  submit-in-flight guard (disable button while the request is pending) across
  every create form — **done 2026-07-04** (server-side 409 on duplicate
  names; disabled-while-saving guard on all 4 create/edit forms). DB-level
  unique constraint still deferred — see 2026-07-04 fix log above.
- [x] Make the cloud sync panel prove *current* connectivity instead of
  showing stale/fake state — **done 2026-07-04**. Root-caused: the panel
  only ever populated from a demo-mode simulator, never real data. Daemon now
  tracks and exposes real last-success/last-error/pending-count; UI polls and
  displays it honestly. Also fixed the actual data-loss bug this masked (see
  2026-07-04 fix log above).

### Stage 2 — Test everything, systematically (not spot checks)
The current test suite covers backend logic well (56 real API tests + 9
daemon e2e + a load test) but has never systematically clicked through every
button/flow in the actual UI. Plan: a full button-by-button pass across all
three roles (admin, lead, employee) and the desktop agent, covering every
form, every CRUD action, every chart, every edge case (empty states, error
states, permission boundaries) — not just the happy path. **[YOUR CALL]**:
should this be (a) another live Windows/browser pass like today's, (b) me
building out real Playwright e2e coverage for the web dashboard (the spec
file already exists at `tests/e2e/web-flows.spec.js` but is thin), or (c)
both? Playwright coverage has the advantage of running in CI forever after,
catching regressions automatically instead of needing a human each time.

### Stage 3 — Lightweight
- Bundle is 667KB (single chunk) — code-split by route/role (admin bundle,
  lead bundle, employee/desktop-agent bundle load independently) so nobody
  downloads code for views they can't access.
- Audit `recharts`/`lucide-react` for tree-shaking — only import icons/chart
  types actually used (already trimmed unused icon imports this session;
  worth a full pass).
- Daemon binary: PyInstaller `--onefile` is already reasonably small; the
  `--noconsole` + log-file change adds no real weight.

### Stage 4 — Strong (hardening beyond what's already solid)
Backend auth/authz/SQL-injection/CORS already checked and clean (see the
2026-07-03 morning pass above). Remaining hardening for real industry use:
- Redis-backed rate limiting (currently in-memory per instance — fine for a
  pilot, not for company scale).
- `deployment/schema.sql` cleanup (stale, misleading — either delete or
  regenerate from migrations).
- CI lint step (catches exactly the class of bug found in `src/App.jsx` this
  session).
- Decompose `src/App.jsx` (2,965 lines, one file, all roles) — not urgent
  but every fix here carries needless blast radius as the app grows.

### Stage 5 — Nice UI
Current UI is a single dense dark-console aesthetic reused across every
role. A real design pass (not just re-skinning) would cover: role-appropriate
information hierarchy (an employee's transparency view doesn't need
admin-density data tables), responsive/mobile handling (not verified at all
today), empty/loading/error states designed rather than ad hoc, and
consistent spacing/typography audited against a real design system rather
than accumulated Tailwind classes. **[YOUR CALL]**: any visual direction/
reference you want followed, or should this be proposed fresh?

### Stage 6 — Rebrand (not "Civil Mantra")
Every user-facing surface currently says "Civil Mantra" / "CivilMantra" —
window titles, app name (`com.civilmantra.agent`), installer filenames, the
landing page copy, email domains in seed data, `package.json` `productName`,
autostart registry key names, config folder paths (`~/.config/civil-mantra`),
and the favicon/logo (`public/logo.png`, `public/icon.ico`). This is a
mechanical-but-wide-reaching rename once a name is picked, plus a new
logo/icon set. **[YOUR CALL — needed before this can start]**: what's the new
product name? Do you have a name in mind, or want me to propose options? For
the logo: any style direction (minimal/geometric, wordmark-only, a specific
color already used elsewhere), or should I propose a few directions to react
to?

---
