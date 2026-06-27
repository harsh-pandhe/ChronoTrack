// scripts/verify-render.cjs — headless check that the packaged SPA actually
// renders (React mounts into #root) when served over app://, the same way the
// packaged app loads it. Run: xvfb-run -a node_modules/.bin/electron scripts/verify-render.cjs
const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('disable-gpu');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

const errors = [];

app.whenReady().then(async () => {
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/' || pathname === '') pathname = '/index.html';
    return net.fetch(pathToFileURL(path.join(__dirname, '..', 'dist', pathname)).toString());
  });

  const win = new BrowserWindow({ show: false, width: 1200, height: 800 });
  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) errors.push(message); // warnings+errors
  });
  win.webContents.on('did-fail-load', (_e, code, desc, url) =>
    errors.push(`did-fail-load ${code} ${desc} ${url}`)
  );

  await win.loadURL('app://bundle/index.html?app=employee');
  // Give React a moment to mount.
  await new Promise((r) => setTimeout(r, 2500));

  const result = await win.webContents.executeJavaScript(`(() => {
    const root = document.getElementById('root');
    return JSON.stringify({
      rootChildren: root ? root.children.length : -1,
      bodyTextLen: document.body.innerText.trim().length,
      title: document.title,
    });
  })()`);

  console.log('RENDER_RESULT ' + result);
  console.log('ERRORS ' + JSON.stringify(errors.slice(0, 6)));
  app.exit(0);
});
