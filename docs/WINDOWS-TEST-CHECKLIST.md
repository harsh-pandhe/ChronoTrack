# ChronoTrack — Windows Smoke Test Checklist

Give this file to whoever is testing on the Windows machine. Work through it
top to bottom, fill in **Result** (PASS / FAIL / N/A) and **Notes** for every
item, then paste the whole filled-in file back into the Linux/Claude session.
That session will read your answers, fix whatever failed, and re-issue a
build if needed.

**Build under test:** commit `d1e731e` on branch `claude/competent-gould-9bb9e5`
(daemon-window fix + Exit Agent fix + Release-workflow fix, 2026-07-02).

---

## 0. Get the installer

Two options — use whichever you have access to:

**A. GitHub Actions artifact (this exact build)**
1. Go to: https://github.com/harsh-pandhe/ChronoTrack/actions/runs/28621882143
2. Under **Artifacts**, download `windows-installer` (zip).
3. Unzip it — inside is `ChronoTrackAgent Setup 3.0.0.exe`.
4. Note: GitHub Actions artifacts need you to be logged into GitHub to download.

**B. Build it yourself on the Windows machine**
Follow `docs/BUILD-WINDOWS.md` section B. Only do this if (A) isn't available.

| Step | Result (PASS/FAIL) | Notes |
|---|---|---|
| Installer downloaded / built successfully | | |

---

## 1. Install

1. Run `ChronoTrackAgent Setup 3.0.0.exe`.
2. Windows SmartScreen will very likely say **"Windows protected your PC" /
   "Unknown publisher"**. This is expected — the installer isn't code-signed
   yet (needs a paid Authenticode cert, tracked separately). Click **More
   info → Run anyway**.
3. Complete the install wizard.

| Step | Result | Notes |
|---|---|---|
| SmartScreen warning appeared (expected — not a bug) | | |
| Install completed without errors | | |
| App launches after install | | |

---

## 2. First launch — no visible daemon window (bug fix to verify)

This is the main thing that was broken before: the background telemetry
daemon used to pop up its own separate console window. It should now be
completely invisible.

1. Launch **ChronoTrack Agent** from the Start Menu / Desktop shortcut.
2. Watch closely for a few seconds as it starts.
3. Open **Task Manager** (Ctrl+Shift+Esc) → **Details** tab → look for
   `ChronoTrackDaemon.exe`.

| Step | Result | Notes |
|---|---|---|
| A black console/terminal window popped up when the app launched | PASS = it did NOT pop up | |
| `ChronoTrackDaemon.exe` is visible in Task Manager → Details tab | | |
| The app's own window (the dashboard UI) looks normal, no extra windows | | |

---

## 3. Activation

1. In the app, use the **onboarding / activation** screen.
2. You'll need an activation code — ask whoever has admin/lead access to the
   web dashboard (https://chrono-track-tau.vercel.app) to generate one for
   your employee account, or reuse one if you already have it.
3. Tick the consent checkbox(es), enter your email + the 8-digit code,
   click **Activate**.

| Step | Result | Notes |
|---|---|---|
| Activation succeeded (no error) | | |
| App shows the "My Productivity" / desktop-agent dashboard after activating | | |
| Daemon status shows "Daemon Active (Port 5050)" (not "Daemon Offline") | | |

---

## 4. Telemetry actually reaches the cloud

1. Leave the app running, switch between a couple of other windows/apps for
   ~1 minute (so there's something to capture).
2. On a **separate device or browser tab**, log into the web dashboard as
   admin or your team lead: https://chrono-track-tau.vercel.app
3. Check **Telemetry Logs** / your own analytics — new rows should appear
   within a minute or two.

| Step | Result | Notes |
|---|---|---|
| New telemetry rows appear in the web dashboard | | |
| Window titles / app categories look reasonable (not garbled) | | |

---

## 5. "Exit Agent" (bug fix to verify)

This used to incorrectly show the public marketing landing page instead of
actually closing the app.

1. In the app header, click **Exit Agent**.

| Step | Result | Notes |
|---|---|---|
| The app window closes entirely (PASS) | | |
| The app instead showed the "ChronoTrack" marketing/landing page (FAIL — this is the old bug) | | |

---

## 6. Daemon survives after Exit Agent (background collection)

The whole point: the app window can close, but telemetry collection must
keep running in the background.

1. After clicking Exit Agent (step 5), open Task Manager again.
2. Wait ~1 minute, then check the web dashboard again (step 4) for fresh
   telemetry rows.

| Step | Result | Notes |
|---|---|---|
| `ChronoTrackDaemon.exe` is STILL running in Task Manager after Exit Agent | | |
| Fresh telemetry rows keep appearing in the web dashboard after Exit Agent | | |

---

## 7. Autostart survives reboot

1. Restart the Windows machine (or at least log out and back in).
2. After logging back in, wait ~30 seconds, then open Task Manager.

| Step | Result | Notes |
|---|---|---|
| `ChronoTrackDaemon.exe` is running again after reboot, without manually opening the app | | |
| New telemetry rows appear in the web dashboard after reboot (give it a minute) | | |

---

## 8. Re-opening the app doesn't re-prompt activation

1. Open **ChronoTrack Agent** again from the Start Menu.

| Step | Result | Notes |
|---|---|---|
| App opens directly to the dashboard (does NOT ask you to activate again) | | |

---

## 9. Consent withdrawal (optional, only if you're comfortable re-activating after)

1. Find the consent-withdrawal option (web dashboard → your profile, or
   in-app if present).
2. Withdraw consent.

| Step | Result | Notes |
|---|---|---|
| Telemetry stops (no new rows in web dashboard after withdrawal) | | |
| Daemon shows a "revoked" / halted state, doesn't error-loop | | |

---

## 10. General notes

- Any crash, error dialog, or console error? Screenshot it and describe when
  it happened.
- Anything visually broken (layout, fonts, colors)?
- Anything that felt slow or janky?

Free-form notes:

```
(fill in here)
```

---

## How to send results back

Copy this whole file (with your PASS/FAIL/Notes filled in) and paste it into
the Linux/Claude session as your next message. Include any screenshots
separately if something failed. That session will act on it directly —
fixing bugs, re-triggering builds, or updating the roadmap.
