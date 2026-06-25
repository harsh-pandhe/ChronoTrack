# ⏱️ Civil Mantra: Transparent Telemetry & Workforce Optimization System

Civil Mantra (ChronoTrack Enterprise) is an advanced Transparent Desktop Telemetry & Profitability Engine designed for desk-bound workforces of **1,600+ employees**. The system transitions organizations from manual, error-prone time tracking to a secure telemetry-backed architecture. It monitors hardware uptime and input densities to verify true utilization and prevent margin leaks.

---

## 🏗️ Architecture & Component Split

The platform is split into two runtime environments connected to a telemetry tracking process:

```
                                +---------------------------+
                                |  Central Cloud Backend    |
                                +-------------+-------------+
                                              ^
                                              | (DB Synchronization)
                                              |
+---------------------------------------------+---------------------------------------------+
|                                  Employee Workspace PC                                     |
|                                                                                           |
|  +--------------------------+       +--------------------------+  +--------------------+  |
|  |  Background Daemon (5050) | ----> |  Electron Desktop App    |  | SQLite Local DB    |  |
|  |  (xinput / xprop polling) |       |  (Locked Agent Tool View)|  | (telemetry.db)     |  |
|  +--------------------------+       +--------------------------+  +--------------------+  |
+-------------------------------------------------------------------------------------------+
```

### 1. Download & Provisioning Landing Page (Web Portal)
* **Installer Downloads**: Serves cross-platform packages: `.deb`/`AppImage` (Linux), NSIS installer `.exe` (Windows), and `.dmg` (macOS).
* **Manager Provisioning Console**: Enables admins and managers to input employee candidates, generate secure 8-digit **Activation Codes**, and revoke unused tokens.

### 2. Transparent Desktop Agent (Employee-Facing)
* **Activation Wizard**: Displays a secure credential check. Employees authenticate using their corporate email and manager-generated activation code.
* **Onboarding & Permissions Consent**: Walks employees through granting system-level authorizations: pointer/keyboard tracking (`xinput`), active window focus tracking (`xprop`), session auto-startup daemon, and local SQLite data caching.
* **Background Telemetry Daemon (`telemetry_daemon.py`)**: A lightweight Python process that queries X11 active window titles via `xprop` and measures input densities (keystroke count and mouse motion events) using `xinput`. It logs to a local SQLite database (`data/telemetry.db`) and hosts a local REST API on port `5050`.

### 3. Strategic Web Dashboard (Admin & Manager-Facing)
* **Role Isolation**: Normal browser sessions default to the Landing page/Admin Console.
* **Bento Grid Analytics Panel**: Summarizes Portfolio Revenue, Resource Costs, Net Profit Margins, and Idle Bench Latencies.
* **Board Headcount & Margin Optimization Simulator**: A real-time slider interface projecting annual overhead saved (in Crores) and operating margin increases.
* **Active Exceptions Console**: Displays flagged logs for manual overrides, inactivity gaps (>3h), and low telemetry activity.
* **Productivity Rules Configurator**: Allows admins to define Whitelisted (productive) and Blacklisted (unproductive) application keywords.

---

## 🛠️ Installation & Deployment

### A. Multi-Platform Agent Installer Packaging
Packaging configs are run via `electron-builder` under target platforms:
```bash
# Build production bundle and package installers for all systems
npm run electron:build
```
* Builds **Linux** `.deb` packages and `AppImage` to `dist-desktop/`
* Builds **Windows** NSIS `.exe` installers to `dist-desktop/`
* Builds **macOS** `.dmg` disk images to `dist-desktop/`

### B. Onboarding & Workspace Node Activation Flow
1. **Provision Account**: Log in to the Manager Provisioning Console on the Web Portal. Create an activation record with the employee's name and corporate email.
2. **Retrieve Code**: Copy the generated 8-digit Activation Key and deliver it to the employee.
3. **Launch Desktop App**: The employee downloads and installs the package, starts the desktop app, and logs in with their credentials.
4. **Grant Permissions**: Approve pointer activity, window tracking, autostart registration, and local cache creation on the onboarding screen to initiate tracking.

### C. Over-The-Air (OTA) Updates
Updates are verified securely at startup:
* Client builds pull signed updates from the repository release endpoints configured under `publish` targets in `package.json`.
* Electron updater (`electron-updater`) downloads updates in the background and applies them silently on application launch/restart.

### D. Central Cloud Web Portal (Vercel Deployment)
The workforce dashboard and manager provisioning console are hosted on **Vercel** with full serverless security and session authorization checks.

#### 1. Setup Vercel Deployment
1. Import this repository into Vercel.
2. Vercel automatically detects **Vite**, configuring the build command (`npm run build`) and output directory (`dist`).

#### 2. Configure Environment Variables
To lock down administrative dashboards and secure team lead views, configure the following **Environment Variables** in Vercel's project dashboard:
* `ADMIN_PASSWORD`: Secure password credential required to access the Administrator Board. (Defaults to `admin123` if not set).
* `TL_PASSWORD`: Secure password credential required to access the Team Lead Board. (Defaults to `lead123` if not set).
* `SESSION_SALT`: A random secret key string used to salt and sign daily session tokens (e.g. `some_random_cryptographic_salt`).

#### 3. Serverless Routing & API Actions
Vercel reads `vercel.json` to handle:
* Serverless API endpoints (`/api/login`, `/api/verify`) served by the Node.js functions in `api/`.
* React Single Page Application (SPA) routing, rewriting all other routes back to `/index.html`.

---

## 🛡️ Telemetry & Transparency Principles
* **Input Densities Only**: The daemon records keystroke/mouse counts within time intervals. It **never** logs actual keystroke characters, inputs, or passwords.
* **Open Window Title Queries**: Retrieves names of active windows (e.g. `VS Code`, `Chrome`) to verify tasks against whitelisted categories. No screenshot buffers or tracking of individual browser tab URLs are recorded to respect employee privacy.

---

## 📄 License
This project is licensed under the MIT License.
