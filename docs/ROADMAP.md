# ChronoTrack — Final Roadmap & Pilot Readiness

_Last updated: 2026-06-27_

## TL;DR
- **Web platform:** ✅ LIVE in production (Vercel + Neon), fully functional.
- **Linux desktop agent:** ✅ builds, installs, activates, captures real
  telemetry, syncs, autostarts — proven on a real machine.
- **Windows desktop agent:** ⏳ build pipeline ready; needs one build + a clean-VM
  smoke test.
- **Scale:** ✅ 25-daemon stage test passes (0 errors).
- **Overall: ~90% for a Linux pilot; ~80% for a Windows+Linux pilot.**

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
- Tests: `test:api` 40/40, `test:daemon` 9/9, `test:load` 25 daemons/0 errors,
  Playwright e2e specs. CI + release workflows.
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
- **Classifier from rules:** daemon currently uses built-in keywords; feed the
  company's Productivity Rules to the daemon (e.g. return rules in the `/api/ingest`
  response and classify productive/unproductive from them).
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
