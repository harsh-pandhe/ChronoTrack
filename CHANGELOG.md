# Changelog

All notable changes to the **ChronoTrack Enterprise** portal will be documented in this file.

---

## [3.0.0] - 2026-06-27
Full rewrite from localStorage prototype to a real, secure, multi-tenant platform.

### Added
- **Secure backend (Neon Postgres):** JWT + bcrypt(12) auth, role-based access
  (admin/lead/employee), per-row `company_id` tenant isolation, audit trail.
  Versioned SQL migrations + one-time admin seed.
- **Org & projects API:** users/projects CRUD with admin-granted `can_manage_employees`
  authority enforced server-side; activation codes (hashed, single-use, expiring).
- **Real telemetry pipeline:** daemon buffers to local SQLite (offline-safe) and
  batch-syncs to `/api/ingest` with per-device tokens; consent withdrawal revokes the
  device and halts collection (DPDP).
- **Real analytics (`/api/analytics`):** role-scoped employee/team/overview rollups —
  active %, active hours, top categories, anomalies, per-project cost/hours/ROI,
  portfolio revenue/cost/margin/bench. Dashboards (overview, Contribution ROI ledger,
  TL live board) now read real data.
- **Self-contained desktop agent:** PyInstaller-bundled daemon (no Python on target);
  installable AppImage + `.deb`; activation flow (email+code → consent → device token).
- **Tests:** `test:api` (29 checks), `test:daemon` (9 checks), Playwright e2e specs.
- **Tooling/docs:** dev API server, DEPLOY runbook, DPIA brief, CI/release workflows.

### Changed
- SPA served over loopback HTTP in packaged builds (fixes blank window; stable origin
  for persisted activation). Demo simulators gated behind `VITE_DEMO_MODE`.

### Security
- Removed hardcoded `admin123`/`lead123` defaults; app refuses to boot without
  `JWT_SECRET` in production. Rate-limited login + ingest. Fixed a path-traversal in
  the in-app static server (confined to `dist/`). DPDP consent + withdrawal + audit.

### Removed
- localStorage-as-database; client-side cloud/telemetry simulators (prod).

---

## [2.1.0] - 2026-06-24
### Added
- **Multi-Platform Installer Downloads**: Provisioned a download hub on the Landing Page serving Linux `.deb`/`AppImage`, Windows NSIS `.exe` installers, and macOS `.dmg` signed packages.
- **Manager Provisioning Console**: Integrated an activation key management panel on the landing page where managers/admins dynamically provision candidate accounts, generate secure 8-digit keys, and revoke unused codes.
- **Desktop Agent Onboarding Portal**: Multi-step permissions checklist on the employee client prompting consent for `xinput` pointer activity, `xprop` window title queries, SQLite db caching, and session autostart registration.
- **OTA Update Integration**: Configured secure auto-update verification from repository release streams.
- **Hardened Daemon Security**: Bound backend listener strictly to loopback (`127.0.0.1:5050`), implemented PID file-locking (`data/daemon.pid`), and configured automatic 5,000-record database pruning to prevent disk bloat.

---

## [2.0.0] - 2026-06-24
- **Python Telemetry Daemon**: Lightweight background service capturing `xinput` pointer/keyboard event densities and active window titles via `xprop`, storing to SQLite, and running a REST API on port `5050`.
- **Standalone Electron Desktop App**: Desktop client wrapper configured through `main.cjs` that launches a locked-size viewport for employees to track time and see telemetry.
- **Role & Runtime Isolation**: System splits views based on query parameters. Normal browser loads exclude employee selectors, and Electron launches lock users strictly into the Employee Assistant.
- **Board Headcount & Margin Optimization Simulator**: Interactive slider widget allowing board members to simulate right-sizing targets (0% to 40% reduction) to estimate annual crore overhead saved and net profit margins.
- **Reactive Exceptions Console & Filter Chips**: Table controls with pills (`Low Activity`, `Low ROI`, `My Session`, `All`) to instantly drill down timesheet warnings.
- **Unified Desktop Agent Installer (`install_agent.sh`)**: Shell utility to verify dependencies, start the telemetry agent, and register background processes as GUI user login startup services.

---

## [1.3.0] - 2026-06-19
- **Weekly Capacity Heatmap Tracker**: Introduced a Monday-Friday capacity card visualizing hours logged against target capacity (8h/day) with color-coded status badges and interactive date-updating click handlers.
- **Dynamic Timesheet Search & Filters**: Added keyword search and project dropdown filters to the timesheet list table for quick real-time audits.
- **Interactive Suggestion Reviewer**: Upgraded automated suggestion imports to an inline reviewer card, allowing users to modify descriptions and fine-tune hours/minutes before import.
- **Interactive Start-Time Dropdown**: Exposed a Start Time selector in the Employee logging form to allow customized starting intervals rather than a hardcoded fallback.
- **Log Sequencing Auto-suggestion**: Automatically defaults the Start Time of a new block to the End Time of the latest block logged on that day, allowing seamless consecutive timesheet recording.
- **Prototype Sandbox Persistence**: Integrated `localStorage` persistence for all timesheets, audit logs, locked periods, and manager approvals.
- **Sandbox Reset Utility**: Added a "Reset Sandbox Data" button to Admin utilities to clear localStorage and restore factory initial state instantly.

### Fixed
- **Time-interval AM/PM Bug**: Replaced hardcoded PM end times with a dynamic time-math parser that properly handles AM/PM and cross-meridian roll-overs.
- **Live Stopwatch Duration Rounding**: Fixed live timer duration rounding. Runs are now rounded to the nearest 15-minute mark for form consistency, while wall-clock start/stop timestamps are mapped directly to the time block intervals.

---

## [1.2.0] - 2026-06-19
### Added
- **FVP Live Stopwatches:** Built an interactive running stopwatch widget in the Employee Portal that captures duration and logs it directly.
- **Smart Suggestions Panel:** Automated mocks for calendar sync, Slack chat threads, and GitHub commit imports.
- **Admin Lock Dates Control:** Toggle to disable time logging for previous months (e.g. May 2026 database locks).
- **Audit Logs Component:** Persistent audit trail logging changes, approvals, and system state updates in real-time.
- **5:00 PM Concurrency Rush Simulator:** Interactive database stress simulator with real-time charting of QPS and database latencies.
- **Project Cost Ledger:** Dynamic costing panel calculating project costs using role billing rates.

### Changed
- Configured and deployed styling with Tailwind CSS v3 for maximum cross-browser and runtime compatibility.
- Upgraded top navigation bar to support user-switching simulation.

---

## [1.1.0] - 2026-06-18
### Added
- Recharts visualizations for project hours allocations and department role distributions.
- Basic manual logging form with fields for Date, Project, Duration, and Task.
- Employee daily log visual timeline showing relative time breakdown in colors.
- Global Admin CSV Export functionality.

---

## [1.0.0] - 2026-06-18
### Added
- Initial project scaffolding using Vite and React.
- Installed base dependencies (`lucide-react`, `recharts`, `postcss`, `autoprefixer`).
- Created basic navigation header and layouts.
