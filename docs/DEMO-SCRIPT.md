# ChronoTrack — Demo / Video Recording Script

A tight 5–7 min walkthrough that shows the whole loop on the **live** system
(https://chrono-track-tau.vercel.app) + the desktop agent.

## Setup before recording
- Have the Windows/Linux agent built (see docs/BUILD-WINDOWS.md / README).
- Admin login ready: `admin@civilmantra.com`.
- One screen for the web portal, one for the desktop agent.

## Scene 1 — Admin provisions (web) ~1 min
1. Log in as admin → **User Directory**: show real employees.
2. **Provision Keys** (or TL → Manage): create an employee → generate the
   8-digit activation code (say it's emailed to the employee).

## Scene 2 — Employee onboards (desktop) ~1.5 min
1. Open the installed **CivilMantra Agent**.
2. Onboarding: tick the **consent** boxes (input counts + window titles, no
   content) — call out the privacy stance.
3. Enter corporate email + the code → **Activate**.
4. Show **My Productivity** self-view filling in (transparency — they see their
   own data). Show the live tracking panel with the real active window.

## Scene 3 — Work happens ~30s
1. Switch between a couple of apps (editor, browser) so densities move.
2. Show the "What were you working on?" prompt → pick a project + duration →
   **Sync Verified Hours** (this is the ROI attribution).

## Scene 4 — Team Lead view (web) ~1 min
1. Log in as the team lead → **Team Live Board**: per-employee active %,
   active-hours chart, anomalies.
2. **Telemetry Logs**: real recent activity feed.

## Scene 5 — Admin analytics (web) ~1.5 min
1. **Dashboard**: portfolio revenue / cost / margin / bench, Daily Active Hours
   chart, Activity-by-Category chart, computed insight + risk.
2. **Contribution ROI**: pick the project → contract value, logged hours,
   attributed cost, per-employee ROI ledger.
3. **Immutable Audit**: show the real audit trail of everything just done.
4. **Productivity Rules**: add a keyword live.

## Scene 6 — Scale + privacy close ~30s
1. Mention the **25-daemon stage test** (`npm run test:load`) — passes with 0
   errors; ready to scale the pilot.
2. Close on privacy: counts + titles only, consent + one-click withdrawal,
   human-in-the-loop decisions (DPDP brief in docs/DPIA-brief.md).

## Reset between takes
- Re-provision a fresh code (codes are single-use).
- To wipe a test employee's data: delete their `telemetry_logs` / `time_entries`
  rows, set `users.status='invited'`, delete their `devices` row.
