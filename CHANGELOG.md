# Changelog

All notable changes to the **ChronoTrack Enterprise** portal will be documented in this file.

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
