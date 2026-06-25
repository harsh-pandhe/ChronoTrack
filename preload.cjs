const { contextBridge } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

function getApiToken() {
  const platform = os.platform();
  let base;
  
  if (platform === 'win32') {
    base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  } else if (platform === 'darwin') {
    base = path.join(os.homedir(), 'Library', 'Application Support');
  } else {
    base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  }
  
  const configDir = path.join(base, 'civil-mantra');
  const configPath = path.join(configDir, 'config.json');
  
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return data.api_token || '';
    }
  } catch (err) {
    console.error('[Electron Preload] Error reading local config token:', err);
  }
  return '';
}

contextBridge.exposeInMainWorld('electronAPI', {
  getApiToken: () => getApiToken()
});
