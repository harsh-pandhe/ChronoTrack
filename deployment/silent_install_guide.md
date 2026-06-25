# Corporate IT Deployment & Silent Installation Guide

This guide details how to roll out the **ChronoTrack (Civil Mantra)** client app and background daemon silently across your client's employee workstations using Active Directory, GPO, or Mobile Device Management (MDM) systems.

---

## 1. Silent Installer Command Switches

### Windows (NSIS Installer)
The packaged Electron installer supports standard NSIS command switches:
* **Silent Install (All Users):**
  ```cmd
  ChronoTrack-Setup.exe /S /allusers
  ```
* **Custom Installation Directory:**
  ```cmd
  ChronoTrack-Setup.exe /S /D=C:\Program Files\CivilMantra
  ```

### macOS (Apple Package)
To run a silent installation of a `.pkg` package on macOS:
```bash
sudo installer -pkg ChronoTrack-Setup.pkg -target /
```

---

## 2. Windows Group Policy (GPO) Distribution Workflow

To roll out the self-signed code signing certificate and the silent installer across the Windows domain:

### Step A: Distribute Self-Signed Certificate
1. Open **Group Policy Management Console (GPMC)** on the Domain Controller.
2. Edit the target Group Policy Object (GPO) or create a new one (e.g., `DeployCivilMantraCert`).
3. Navigate to: **Computer Configuration** ➔ **Policies** ➔ **Windows Settings** ➔ **Security Settings** ➔ **Public Key Policies**.
4. Right-click **Trusted Root Certification Authorities** and select **Import**. Choose `CivilMantraInternalCodeSigning.pfx` (or `.cer`).
5. Right-click **Trusted Publishers** and select **Import**. Choose the same certificate file.
6. Link the GPO to the target Organizational Unit (OU). This registers the certificate and avoids SmartScreen warnings.

### Step B: Push Silent Installer via Startup Script
1. Edit your target deployment GPO.
2. Navigate to: **Computer Configuration** ➔ **Policies** ➔ **Windows Settings** ➔ **Scripts (Startup/Shutdown)**.
3. Select **Startup** ➔ **Properties** ➔ **Add**.
4. Save the `install_cert_gpo.bat` and the `ChronoTrack-Setup.exe` silent command scripts inside the SYSVOL scripts folder.
5. Add the script execution call:
   ```cmd
   \\yourdomain.com\SYSVOL\yourdomain.com\scripts\ChronoTrack-Setup.exe /S /allusers
   ```

---

## 3. Background Daemon System Integration

The telemetry listener daemon (`src-daemon/telemetry_daemon.py`) runs in the background.

### Windows Service Setup
To install the Python daemon as a persistent Windows Service using **NSSM (Non-Sucking Service Manager)**:
```cmd
nssm.exe install CivilMantraDaemon "C:\Program Files\Python311\python.exe" "C:\Program Files\CivilMantra\src-daemon\telemetry_daemon.py"
nssm.exe set CivilMantraDaemon AppDirectory "C:\Program Files\CivilMantra\src-daemon"
nssm.exe set CivilMantraDaemon Start SERVICE_AUTO_START
nssm.exe start CivilMantraDaemon
```

### macOS LaunchAgent Setup
To start the daemon automatically when the user logs in, place a plist configuration at `/Library/LaunchAgents/com.civilmantra.daemon.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.civilmantra.daemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/usr/local/bin/civil-mantra/telemetry_daemon.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```
Activate it:
```bash
sudo launchctl load -w /Library/LaunchAgents/com.civilmantra.daemon.plist
```
