const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let daemonProcess = null;

function startTelemetryDaemon() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  // Packaged builds ship a self-contained PyInstaller binary (no Python needed
  // on the target machine). Dev runs the .py directly via the local interpreter.
  if (!isDev) {
    const binName = process.platform === 'win32' ? 'CivilMantraDaemon.exe' : 'CivilMantraDaemon';
    const binPath = path.join(process.resourcesPath, 'daemon', binName);
    console.log('[ELECTRON] Spawning bundled Telemetry Daemon:', binPath);
    try {
      daemonProcess = spawn(binPath, [], { detached: false, stdio: 'ignore' });
      daemonProcess.on('error', (err) =>
        console.error('[ELECTRON] Failed to start bundled daemon:', err.message)
      );
      if (daemonProcess && daemonProcess.pid) {
        console.log(`[ELECTRON] Bundled daemon spawned (PID: ${daemonProcess.pid})`);
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
      contextBridge: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  win.setMenu(null);

  if (isDev) {
    win.loadURL('http://localhost:5173/');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    win.loadFile(indexPath);
  }
}

app.whenReady().then(() => {
  startTelemetryDaemon();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopTelemetryDaemon();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
