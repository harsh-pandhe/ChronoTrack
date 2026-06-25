const { app, BrowserWindow } = require('electron');
const path = require('path');

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

  // Remove default menu
  win.setMenu(null);

  if (isDev) {
    win.loadURL('http://localhost:5173/');
    // Open DevTools in dev mode
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, load the built index.html from Vite build
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    win.loadFile(indexPath);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
