# ChronoTrack Enterprise — Production Build Plan

**Status:** Planning / pre-implementation
**Owner:** Harsh Pandhe
**Date:** 2026-06-26
**Goal:** Take the current prototype (localStorage dashboard + local-only telemetry daemon + simulated data) to an industry-grade, secure, stable, multi-tenant SaaS that 1,600 real employees can run, so ChronoTrack can measure true project ROI and right-size its workforce on the way from ₹300 Cr to ₹1,000 Cr.

---

## 1. Business context & what the system must prove

ChronoTrack is a ~₹300 Cr engineering/design firm, 1,600 desk-bound employees, target ₹1,000 Cr. They want to **reduce workforce intelligently** — cut what is not productive, keep and grow what drives revenue.

The system must answer, with evidence:

- **Per employee:** How active are they? What projects did they work on? How many real productive hours vs idle/bench? What apps/tools did they actually use?
- **Per project:** Total man-hours consumed, blended cost of those hours, revenue booked, **ROI = (revenue − cost) / cost**, duration, who worked on it.
- **Per team lead:** Their team's utilization, cost vs output, which members and projects perform.
- **Per admin (board):** Portfolio view — which projects make money, which only burn money, total overhead, margin, candidates for cut/reallocation.

The trust contract (must hold or the firm gets legal/morale blowback): **input densities + window titles only.** No keystroke content, no screenshots, no URLs. Consent recorded. Self-reported project attribution via periodic prompts.

---

## 2. Roles & org model

```
Admin (board / HR)
  ├── creates Team Leads and Employees, assigns authority
  ├── sees ALL projects, ALL teams, portfolio ROI
  │
  └── Team Lead (≈30 leads)
        ├── created by Admin (or Admin delegates "create employee" authority to a lead)
        ├── creates / manages Projects
        ├── creates / manages Employees (20–30 each) — only if granted authority
        ├── sees only their team's employees + projects + analytics
        │
        └── Employee (≈1,600 total)
              ├── receives Activation Code (8-digit) from admin/lead
              ├── logs in on web → downloads installer for their OS
              ├── installs desktop agent → activates with email + code
              ├── onboarding: consents + enables background daemon (autostart)
              ├── daemon logs activity + window titles + input density
              ├── every few active hours: prompt "what project are you on?"
              └── time + project attribution flows to cloud
```

**Authority rule:** `can_manage_employees` is a per-team-lead flag set by admin. Admin can always create leads and employees. A lead can create/edit employees only inside their own team and only if granted. This is enforced server-side on every mutation, never trusted from the client.

**Multi-tenancy:** every row carries `company_id`. All queries are scoped to the caller's company. (ChronoTrack is tenant #1; the architecture stays multi-tenant so the product can be resold.)

---

## 3. Target architecture

```
                         ┌─────────────────────────────────────────┐
                         │              Vercel (cloud)               │
                         │                                           │
  Web browser  ───────►  │  React SPA (dashboard, provisioning,      │
  (admin / lead /        │  employee web login + installer download) │
   employee web)         │                                           │
                         │  Serverless API (/api/*)  ── JWT auth ──┐  │
                         └───────────────────────────────────────│──┘
                                                                  │
                                                                  ▼
                                                    ┌──────────────────────────┐
                                                    │   Neon Postgres (cloud)   │
                                                    │  companies, users,        │
                                                    │  projects, assignments,   │
                                                    │  activation_codes,        │
                                                    │  telemetry_logs,          │
                                                    │  time_entries (project    │
                                                    │  attribution), audit_logs │
                                                    └──────────────────────────┘
                                                                  ▲
                                                                  │ HTTPS batch ingest
                                                                  │ (Bearer device token)
  ┌───────────────────────────────────────────────┐             │
  │            Employee Workstation                │             │
  │                                                │             │
  │  Electron desktop agent  ◄──localhost:5050──►  │             │
  │   - activation (email + code → device token)   │  ───────────┘
  │   - onboarding/consent UI                      │
  │   - "what project?" prompt every N active hrs  │
  │                                                │
  │  Python telemetry daemon (autostart)           │
  │   - xinput/xprop (Linux), hooks (Win), idle    │
  │   - local SQLite buffer (offline-safe)         │
  │   - encrypts + batches → cloud ingest          │
  │   - retry queue when offline                   │
  └───────────────────────────────────────────────┘
```

**Key change vs today:** the daemon currently only serves localhost and the dashboard reads simulated/localStorage data. In the target, the **daemon pushes real telemetry to the cloud**, and the **dashboard reads only from the cloud DB**. localStorage is reduced to a UI cache, never the source of truth.

---

## 4. Data model (Postgres, extends existing `deployment/schema.sql`)

All tables get `id UUID PK`, `created_at`, `updated_at`. All business tables get `company_id`.

| Table | Purpose | Key columns |
|---|---|---|
| `companies` | tenant | name, plan, settings |
| `users` | admin / lead / employee | company_id, role (`admin`/`lead`/`employee`), email (unique per company), password_hash, team_lead_id, can_manage_employees, status (`invited`/`active`/`disabled`), hourly_cost |
| `projects` | work units | company_id, name, code, team_lead_id, client, budget, billed_revenue, status, start/end |
| `project_assignments` | who is on a project | project_id, user_id, role_on_project |
| `activation_codes` | onboarding tokens | company_id, user_id, code (8-digit, hashed), expires_at, used_at, device_id |
| `devices` | one employee may have multiple PCs | user_id, device_token_hash, platform, hostname, last_seen |
| `telemetry_logs` | raw activity samples | company_id, user_id, device_id, ts, window_title, app_category, input_density, focus_score, is_idle, ai_label, anomaly_flag |
| `time_entries` | self-reported project attribution | company_id, user_id, project_id, start_ts, end_ts, hours, source (`prompt`/`manual`), note |
| `productivity_rules` | whitelist/blacklist keywords | company_id, keyword, classification |
| `audit_logs` | tamper-evident trail | company_id, actor_user_id, action, target, ip, ts |
| `consents` | GDPR/privacy record | user_id, consent_version, granted_at, ip |

**Derived (computed in API / SQL views, not stored as truth):**
- Project cost = Σ(time_entries.hours × user.hourly_cost) for that project.
- Project ROI = (billed_revenue − cost) / cost.
- Employee utilization = productive_hours / available_hours over a period.

**Migrations:** versioned SQL files in `deployment/migrations/NNN_*.sql`, applied by a migrate script. Never edit applied migrations; add new ones.

---

## 5. Security & compliance (non-negotiable, this is monitoring software)

1. **Auth:** custom users table, **bcrypt** (cost ≥ 12) password hashing. Login issues a **signed JWT** (HS256/RS256) with `sub`, `company_id`, `role`, `exp` (short, e.g. 8h) + refresh token. Verify on every protected endpoint.
2. **No default credentials.** Remove `admin123`/`lead123`/hardcoded salt. App refuses to boot if `JWT_SECRET` / DB URL unset. Seed the first admin via a one-time secure setup script, not a constant.
3. **Device auth:** daemon ingest uses a per-device Bearer token (issued at activation, stored in OS keyring — keyring code already exists). Tokens are revocable; revoke disables a stolen/leaving employee's device.
4. **Activation codes:** generated server-side, **hashed at rest**, single-use, expiring. Verified server-side against email. Client cannot forge.
5. **Transport:** HTTPS only (Vercel default). HSTS. Daemon→cloud over TLS.
6. **Tenant isolation:** every query filtered by `company_id` from the JWT; add Postgres row-level checks as defense-in-depth. Authorization (lead can't touch another team) enforced server-side on every mutation.
7. **CORS:** lock to known origins (the Vercel domain + Electron app origin). Remove the current `*` on credentialed endpoints.
8. **Privacy by design (India DPDP Act 2023 — NOT GDPR; ChronoTrack is Indian):** daemon strips keystroke content and URLs at source (sanitizer exists — keep + test). Window-title sanitization for sensitive apps (banking, health, personal email). Activity/window-title monitoring is **beyond "routine employment" → explicit consent required** (free, specific, informed, unambiguous; no pre-checked boxes). Consent recorded before first sample. **Consent-withdrawal flow is mandatory and must be as easy as granting**, with a defined "what happens to data on withdrawal." Data retention policy + employee data-export/delete request flow. **DPIA (Data Protection Impact Assessment) + legitimate-use assessment required before rollout.** Non-compliance penalties reach **₹250 Cr** — existential for a ₹300 Cr firm.
9. **Human-in-the-loop decisions (DPDP / GDPR Art 22):** the system's purpose is workforce reduction — an automated decision adversely affecting people. The platform **recommends, humans decide.** No auto-flag-to-fire. Every adverse recommendation carries a right to human review and an explanation of the data behind it.
10. **Secrets:** all via Vercel env vars + OS keyring on client. Nothing in git. Rotate-able.
11. **Audit everything:** every admin/lead mutation and every login writes an immutable `audit_logs` row.
12. **Rate limiting** on login (brute-force) and ingest (abuse/backpressure).
13. **Code signing:** Windows Authenticode + macOS notarization on installers, or OS blocks install. (Cert generation scripts exist; need real certs + signing in CI.)

---

## 6. Telemetry pipeline (real, replacing the simulator)

1. Daemon samples locally (xinput/xprop/Win hooks/macOS idle — already built) into local **SQLite buffer**.
2. Daemon classifies + anomaly-flags locally (already built), sanitizes (already built).
3. Every N seconds, daemon **batches unsent rows → `POST /api/ingest`** with device Bearer token. On success, marks rows synced; on failure, keeps them and retries (offline-safe queue).
4. Every few **active** hours, the Electron app shows a **non-blocking prompt**: "What project were you working on?" → writes a `time_entries` row (project + hours) to cloud. Employee can also log/edit time manually.
5. Cloud stores raw `telemetry_logs` + attributed `time_entries`. Dashboards read aggregates.
6. **Remove** the client-side `Telemetry Simulator` / `isSimulated` fallback from production builds (keep a clearly-labeled demo mode behind a flag for sales/demos only).

---

## 7. Analytics surfaces

- **Employee (own view / lightweight):** my active hours today/week, my projects, my logged time. Transparency builds trust.
- **Team Lead:** team roster utilization, per-employee active vs idle, per-project hours/cost/ROI for their projects, exceptions (inactivity > 3h, low telemetry, manual overrides).
- **Admin / board:** portfolio bento — total revenue, total resource cost, net margin, idle bench cost. Per-project ROI ranking (winners vs money-burners). Headcount/margin simulator (already prototyped) now driven by **real** numbers. Drill from project → people → telemetry.

All numbers come from server-side aggregation queries over `telemetry_logs` + `time_entries` + `users.hourly_cost` + `projects.billed_revenue`.

---

## 8. Reliability & scale (1,600 daemons)

- **Ingest batching + compression**; cap batch size; server returns backpressure signal.
- **DB indexing** on (company_id, user_id, ts), (project_id), partial indexes for hot queries. Consider monthly partitioning of `telemetry_logs`.
- **Offline-first daemon:** local buffer survives network loss, reboots; retry with backoff; never lose data, never block the user's PC.
- **Daemon watchdog / autostart** verified per-OS; crash recovery; graceful shutdown.
- **OTA updates** (`electron-updater`) against a real signed release repo; rollback path.
- **Observability:** central error logging, daemon heartbeats (`last_seen`), alerting on mass dropout or ingest failure.
- **Load test** ingest + dashboard before rollout.

---

## 9. Packaging & deployment

- **Bundle the Python daemon** (PyInstaller → single binary in `extraResources`) so clean machines need no Python/pip. Current spawn assumes `python3`+deps on PATH → fails on real user PCs. This is a hard blocker for IRL install.
- Verify packaged `.deb`/`AppImage`/`.exe`/`.dmg` on **clean** Linux/Windows/macOS VMs.
- **Silent/GPO corporate deploy** path tested (scripts exist in `deployment/`), plus uninstall path.
- Web portal stays on **Vercel** (Vite SPA + serverless `api/`), now backed by Neon.

---

## 10. Phased roadmap

**Phase 0 — Foundations (this plan + setup)**
Provision Neon, set env vars, migration tooling, CI skeleton. Remove default creds.

**Phase 1 — Backend foundation**
Migrations for full schema. Auth API (register-by-admin, login, JWT, refresh, logout). Org/user/team CRUD with role + authority enforcement. Project CRUD + assignments. Audit logging. Multi-tenant scoping. Tests.

**Phase 2 — Provisioning & activation**
Admin/lead create leads+employees. Activation code generation (server, hashed, expiring). Employee web login → installer download page. Desktop activation endpoint (email+code → device token). Consent capture.

**Phase 3 — Real telemetry pipeline**
Daemon → cloud ingest endpoint + device auth. Offline buffer + retry. Electron "what project?" prompt → `time_entries`. Remove simulator from prod. Wire dashboard reads to cloud (kill localStorage-as-DB).

**Phase 4 — Analytics**
Server-side aggregation queries + views. Employee/Lead/Admin dashboards on real data. ROI ledger, utilization, exceptions, headcount simulator driven by real numbers.

**Phase 5 — Hardening & packaging**
Bundle daemon (PyInstaller). Code-sign + notarize installers. Rate limits, CORS lockdown, RLS. Clean-VM install tests on all 3 OS. OTA signed release + rollback.

**Phase 6 — Reliability, scale, compliance**
Indexing/partitioning, load test, observability/alerting, retention policy, data export/delete flow, DPA/consent docs. Security pentest.

**Phase 7 — Pilot rollout**
One team (~25 ppl) → one department → full 1,600. Monitor, tune AI/anomaly on real data, iterate.

---

## 11. "Ready to test IRL" gate (Phases 1–3 + minimal 5)

Real loop works on real machines: admin creates lead → lead creates project + employee → employee logs in web, downloads, installs, activates → daemon autostarts, captures real activity, prompts for project, syncs to cloud → dashboard shows that employee's real hours and project. Auth secure (no defaults), installers signed, clean-VM install verified on the OSes in the pilot.

## 12. "Ready for full production" gate (all phases)
Full 1,600-scale load tested, compliance + retention + consent in place, observability/alerting live, pentest passed, OTA + rollback proven, staged rollout complete.

---

## 13. Open items needing your input before/while building
- **First-admin bootstrap:** how is ChronoTrack's first admin account seeded? (one-time CLI seed script recommended)
- **`hourly_cost` source:** per-employee cost — entered by admin/HR, or band/grade based? Needed for ROI.
- **`billed_revenue` source:** entered per project by lead/admin, or pulled from an existing finance/ERP system?
- **Prompt cadence "every few hours":** exact interval (e.g. every 2 active hours) and whether it's blocking or dismissible.
- **Sensitive-app blocklist:** which app/window titles must never be logged (banking, health, personal mail) for the privacy contract.
- **Pilot team:** which ~25-person team and which OS mix for first IRL test.
