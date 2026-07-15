# Migration / Session Handoff — continue on Windows

You're picking this up on a Windows machine. Everything below is what a
fresh Claude Code session there needs to pick up exactly where this one
left off. Git already has all the work — nothing is stuck in this Linux
worktree.

**Repo:** https://github.com/harsh-pandhe/ChronoTrack.git
**Branch:** `claude/competent-gould-9bb9e5`
**Latest commit:** `e5a8625` — clean, pushed, `git status` empty.

---

## 1. Get the code on Windows

Install once if not already present: [Node 22](https://nodejs.org),
[Python 3.12](https://python.org) (tick "Add to PATH"), [Git](https://git-scm.com),
and the [GitHub CLI](https://cli.github.com) (`gh`) if you want to trigger
Actions builds from the terminal instead of the web UI.

```powershell
git clone https://github.com/harsh-pandhe/ChronoTrack.git
cd ChronoTrack
git checkout claude/competent-gould-9bb9e5
npm ci
gh auth login   # only if you want to use gh from here; separate login per machine
```

Then open this folder in Claude Code and tell it:
> Read docs/ROADMAP.md and docs/MIGRATION.md, then continue from where we left off.

That's the full context transfer — no session state to copy, it's all in
these two files plus the commit history.

---

## 2. What's already done (full detail in `docs/ROADMAP.md`)

- Full backend re-verification pass: 56/56 API tests, 9/9 daemon e2e, 25-daemon
  load test, all against real Postgres. `npm audit` clean.
- Fixed a broken `load-test.js` (was hitting dead endpoints), two TDZ hook-order
  bugs in `App.jsx`, an ESLint config gap, a `CSC_LINK` regression that broke
  every Windows build since 07-02, the daemon's console-window problem (now a
  real fix: `--noconsole` + log-file redirect, not just `windowsHide`), a live
  `ctypes` crash loop in the keyboard hook, and the root cause behind "wrong
  project shown" — `active_project_id` never wrote to `project_assignments`.
- Prod DB cleanup: removed a test employee account (since re-created by
  testing — prod org has since drifted again, see roadmap item 4).
- Windows installer artifact from *before* today's last fix batch (`102d2ff`):
  https://github.com/harsh-pandhe/ChronoTrack/actions/runs/28621882143
  — **a fresh build with `102d2ff` has not been triggered yet.**

## 3. Immediate next steps, in order

1. **Trigger a fresh Windows build** with the latest fixes:
   `gh workflow run release.yml --ref claude/competent-gould-9bb9e5` (or
   Actions tab → "Release (build installers)" → Run workflow → pick this
   branch). Wait ~3 min, grab the `windows-installer` artifact.
2. **Clean install** — before testing, fully uninstall any existing
   ChronoTrack Agent (Add/Remove Programs) and delete old installer `.exe`
   files from Downloads. Last test likely ran a stale pre-fix installer
   (duplicate file was sitting there), which is the leading theory for why
   "Exit Agent" looked unfixed even though the source is confirmed correct.
3. Re-run `docs/WINDOWS-TEST-CHECKLIST.md`, focusing on the items still
   unconfirmed: Exit Agent, fresh activation (not leftover state), daemon
   console window after reboot, the keyboard-hook crash (check
   `%APPDATA%\chronotrack\data\daemon.log` for the old ctypes traceback —
   should no longer appear).
4. Once Stage 1 in the roadmap's "Path to an industry-grade v1.0" section is
   closed out, move to the rebrand (see below).

## 4. Rebrand — done, approved name: **ChronoTrack**

An earlier planning note here proposed "Meridian" as the display name; that
was never implemented and is superseded — the name actually shipped is
**ChronoTrack**, matching `package.json`'s `name` field and the config-folder
slug (`~/.config/chronotrack`, `%APPDATA%\chronotrack`) that was already in
use, so display name and internal identifiers are now consistent.

Rebrand touched every user-facing surface: window titles, `package.json`
(`productName`, `appId: com.chronotrack.agent`), installer filenames, the
landing page copy, seed data email domains (`@chronotrack.app`), autostart
identifiers (Windows `HKCU...Run\ChronoTrackDaemon`, Linux
`chronotrack-daemon.service`, macOS `com.chronotrack.daemon`), and the OS
keyring service name (`ChronoTrack`). Logo/icon set
(`public/logo.png`, `public/icon.ico`, `public/favicon.svg`) was left
unchanged — no new artwork was supplied; swap those files in whenever new
branding assets exist.

Config-folder + keyring rename was the part needing care: existing installs
on real machines had data under the old identifiers (`civil-mantra` folder,
`CivilMantra` keyring service). Both `main.cjs` and
`src-daemon/telemetry_daemon.py` now carry a one-time migration: on first run
under the new name, if the new location is empty but the old one has data,
it's moved/re-read forward automatically (config dir via `os.rename`,
keyring entries via read-old/write-new-then-delete-old), so upgrading
existing installs doesn't lose local state or activation.

## 5. Credentials note

Prod `DATABASE_URL` (Neon) was pasted directly in chat this session to do a
one-off cleanup query. It was **not** committed anywhere in this repo. Two
things worth doing before real employee data goes near this:
- Rotate the Neon password and set a new `JWT_SECRET` in Vercel (roadmap
  item 3 — still open).
- If you need DB access again, prefer putting `DATABASE_URL` in a local
  `.env.local` (already gitignored, see `.env.example`) rather than pasting
  the raw connection string into chat.

## 6. Everything else

`docs/ROADMAP.md` is the living source of truth — read it in full before
starting new work. It has the complete bug list, the full "Path to an
industry-grade v1.0" plan (lightweight/strong/tested/nice-UI stages), and
what's still open per stage.
