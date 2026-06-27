# Build the Windows installer (.exe)

Two ways. Use **A** (GitHub Actions) once billing is enabled; use **B** (Windows
VM/PC) right now.

## A. GitHub Actions (preferred, once enabled)
GitHub Actions on a **private** repo uses metered minutes; the build is currently
blocked by "Actions budget is preventing further use". Fix one of:
- **Settings → Billing and licensing → Spending limit** → set a small limit (e.g. $5)
  and enable Actions. (Windows runners bill 2× minutes; a build is a few minutes.)
- or make the repo **public** (Actions then free) — only if you're OK open-sourcing.

Then: **Actions → "Release (build installers)" → Run workflow** (or push a tag
`git tag v3.0.0 && git push origin v3.0.0`). The `.exe` lands in the run's
Artifacts (manual run) or attached to the GitHub Release (tag run).

## B. On a Windows 10/11 machine or VM (works now)
Install once: [Node 22](https://nodejs.org), [Python 3.12](https://python.org)
(tick "Add to PATH"), and [Git](https://git-scm.com).

```powershell
git clone https://github.com/harsh-pandhe/ChronoTrack.git
cd ChronoTrack
npm ci

# 1. Bundle the telemetry daemon into a self-contained .exe (no Python on targets)
python -m pip install --upgrade pip pyinstaller cryptography keyring pywin32
pyinstaller --onefile --name CivilMantraDaemon --distpath dist-daemon `
  --hidden-import keyring.backends.Windows --hidden-import cryptography.fernet `
  src-daemon/telemetry_daemon.py

# 2. Build the web UI, pointing at your cloud (skip $env line for an offline test build)
$env:VITE_API_BASE="https://YOUR-VERCEL-URL"
npm run build

# 3. Build the installer
npx electron-builder --win nsis --publish never
```
Output: `dist-desktop\CivilMantraAgent Setup 3.0.0.exe`.

### Notes
- Unsigned → SmartScreen shows "Windows protected your PC / Unknown publisher".
  Click **More info → Run anyway** for the pilot. For wider rollout buy an
  Authenticode cert and set `win.certificateFile` / `CSC_KEY_PASSWORD`.
- If `electron-builder` complains about the icon, it derives `.ico` from
  `public/logo.png` (must be ≥256×256). Add a real `public/icon.ico` to customise.
- The bundled daemon uses Windows low-level keyboard/mouse hooks (ctypes) — these
  work on a normal desktop session; in some locked-down VMs hooks may be limited.
