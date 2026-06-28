const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

// NOTE: do NOT force --no-sandbox. On some kernels the unsandboxed path fails to
// create /dev/shm shared memory (ESRCH) and the renderer aborts. The .deb ships
// chrome-sandbox setuid-root (like Discord/VS Code), so the normal sandbox works.

let daemonProcess = null;
let staticServer = null;

// Serve the built SPA over loopback HTTP. Loading Vite's ES-module
// <script type="module"> over file:// is blocked by Chromium (CORS, null
// origin) and leaves a blank window; HTTP loads modules exactly like the dev
// server does. Returns the chosen port.
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
};
// Fixed port so the renderer origin (http://127.0.0.1:PORT) stays constant across
// restarts — otherwise localStorage (which holds the activation state) resets
// every launch and the app re-prompts for an activation code.
const STATIC_PORT = 47615;
function startStaticServer() {
  const root = path.join(__dirname, 'dist');
  return new Promise((resolve) => {
    staticServer = http.createServer((req, res) => {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath === '/') urlPath = '/index.html';
      let filePath = path.join(root, urlPath);
      // Confine to dist/ (block path traversal e.g. /../../etc/passwd).
      if (!path.resolve(filePath).startsWith(path.resolve(root) + path.sep)) {
        filePath = path.join(root, 'index.html');
      }
      // SPA fallback: unknown non-asset routes serve index.html.
      if (!fs.existsSync(filePath)) filePath = path.join(root, 'index.html');
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        res.setHeader('Content-Type', MIME[path.extname(filePath)] || 'application/octet-stream');
        res.end(data);
      });
    });
    staticServer.on('error', () => {
      // Port busy (another instance) — fall back to an ephemeral port.
      staticServer.listen(0, '127.0.0.1', () => resolve(staticServer.address().port));
    });
    staticServer.listen(STATIC_PORT, '127.0.0.1', () => resolve(STATIC_PORT));
  });
}

// Register the telemetry daemon to start automatically on user login, so it
// runs as a background service independent of the app window.
function registerAutostart(binPath) {
  try {
    if (process.platform === 'linux') {
      // systemd --user unit
      const dir = path.join(require('os').homedir(), '.config', 'systemd', 'user');
      fs.mkdirSync(dir, { recursive: true });
      const unit = `[Unit]
Description=Civil Mantra Telemetry Daemon
After=default.target

[Service]
ExecStart=${binPath}
Restart=on-failure

[Install]
WantedBy=default.target
`;
      fs.writeFileSync(path.join(dir, 'civilmantra-daemon.service'), unit);
      spawn('systemctl', ['--user', 'enable', '--now', 'civilmantra-daemon.service'], { stdio: 'ignore' });
    } else if (process.platform === 'win32') {
      // Run key -> autostart at logon
      spawn('reg', ['add', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
        '/v', 'CivilMantraDaemon', '/t', 'REG_SZ', '/d', binPath, '/f'], { stdio: 'ignore' });
    } else if (process.platform === 'darwin') {
      const dir = path.join(require('os').homedir(), 'Library', 'LaunchAgents');
      fs.mkdirSync(dir, { recursive: true });
      const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.civilmantra.daemon</string>
  <key>ProgramArguments</key><array><string>${binPath}</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict></plist>
`;
      fs.writeFileSync(path.join(dir, 'com.civilmantra.daemon.plist'), plist);
    }
    console.log('[ELECTRON] Autostart registered for', process.platform);
  } catch (err) {
    console.error('[ELECTRON] Autostart registration failed:', err.message);
  }
}

function startTelemetryDaemon() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  // Packaged builds ship a self-contained PyInstaller binary (no Python needed
  // on the target machine). Dev runs the .py directly via the local interpreter.
  if (!isDev) {
    const binName = process.platform === 'win32' ? 'CivilMantraDaemon.exe' : 'CivilMantraDaemon';
    const binPath = path.join(process.resourcesPath, 'daemon', binName);
    // Register the daemon to autostart on login so collection runs independently
    // of the app window (the daemon's single-instance lock prevents duplicates).
    registerAutostart(binPath);
    console.log('[ELECTRON] Spawning bundled Telemetry Daemon (detached):', binPath);
    try {
      // detached + unref so the daemon survives the app window closing.
      daemonProcess = spawn(binPath, [], { detached: true, stdio: 'ignore' });
      daemonProcess.on('error', (err) =>
        console.error('[ELECTRON] Failed to start bundled daemon:', err.message)
      );
      if (daemonProcess && daemonProcess.pid) {
        console.log(`[ELECTRON] Bundled daemon spawned (PID: ${daemonProcess.pid})`);
        daemonProcess.unref();
      }
    } catch (err) {
      console.error('[ELECTRON] Exception spawning bundled daemon:', err);
    }
    return;
  }

  // --- Dev mode: run the Python source directly ---
  const daemonPath = path.join(__dirname, 'src-daemon', 'telemetry_daemon.py');
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  console.log('[ELECTRON] Spawning Telemetry Daemon (dev):', daemonPath);
  try {
    daemonProcess = spawn(pythonCmd, [daemonPath], { detached: false, stdio: 'ignore' });
    daemonProcess.on('error', (err) => {
      console.error('[ELECTRON] Failed to start telemetry daemon:', err.message);
      if (pythonCmd === 'python3') {
        console.log('[ELECTRON] Retrying with "python"...');
        try {
          daemonProcess = spawn('python', [daemonPath], { detached: false, stdio: 'ignore' });
        } catch (retryErr) {
          console.error('[ELECTRON] Retry failed:', retryErr.message);
        }
      }
    });
    if (daemonProcess && daemonProcess.pid) {
      console.log(`[ELECTRON] Telemetry Daemon spawned successfully (PID: ${daemonProcess.pid})`);
    }
  } catch (err) {
    console.error('[ELECTRON] Exception spawning daemon:', err);
  }
}

function stopTelemetryDaemon() {
  if (daemonProcess) {
    console.log('[ELECTRON] Terminating Telemetry Daemon...');
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', daemonProcess.pid, '/f', '/t']);
      } else {
        daemonProcess.kill('SIGTERM');
      }
    } catch (err) {
      console.error('[ELECTRON] Error killing daemon process:', err);
    }
    daemonProcess = null;
  }
}

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    resizable: true,
    maximizable: true,
    title: "Civil Mantra Enterprise Console",
    backgroundColor: "#030712",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // sandbox:false so preload.cjs can use Node (fs) to read the daemon token.
      // Still safe: contextIsolation on, nodeIntegration off, only a tiny bridge.
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  win.setMenu(null);

  // The packaged desktop app IS the employee agent → default to the employee view.
  const employeeMode = process.env.CT_EMPLOYEE === '1' || app.isPackaged;
  const query = employeeMode ? '?app=employee' : '';
  if (isDev) {
    win.loadURL('http://localhost:5173/' + query);
  } else {
    win.loadURL(`http://127.0.0.1:${staticPort}/index.html${query}`);
  }
}

let staticPort = 0;

app.whenReady().then(async () => {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (!isDev) {
    staticPort = await startStaticServer();
  }
  startTelemetryDaemon();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Do NOT stop the daemon — it runs as a background service (autostart) and
  // keeps collecting after the window closes. In dev, stop it to avoid orphans.
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) stopTelemetryDaemon();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
