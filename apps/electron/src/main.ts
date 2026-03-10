/**
 * @keepai/electron — Electron main process.
 *
 * Startup sequence:
 * 1. Start keepd server on DEFAULT_PORT
 * 2. Create browser window (loads http://127.0.0.1:DEFAULT_PORT)
 * 3. Create tray icon with context menu
 * 4. Listen to SSE for desktop notifications
 * 5. Hide macOS dock icon
 */

// Electron 33's Node.js 20 lacks global WebSocket — polyfill before nostr-tools loads
import WebSocket from 'ws';
if (!globalThis.WebSocket) {
  (globalThis as any).WebSocket = WebSocket;
}

import { autoUpdater } from 'electron-updater';
import createDebug from 'debug';
import * as os from 'os';
import * as fs from 'fs';
import * as util from 'util';
import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  ipcMain,
  shell,
  nativeImage,
} from 'electron';
import * as path from 'path';
import { createServer } from '@keepai/daemon';
import type { KeepServer } from '@keepai/daemon';
import { DEFAULT_PORT } from '@keepai/proto';

// Redirect debug output to log file (in addition to stderr)
const keepaiDir = path.join(os.homedir(), '.keepai');
fs.mkdirSync(keepaiDir, { recursive: true });
const logPath = path.join(keepaiDir, 'debug.log');
const logStream = fs.createWriteStream(logPath, { flags: 'a' });
const originalLog = createDebug.log;
createDebug.log = (...args: any[]) => {
  const line = util.format(...args);
  originalLog(line);
  logStream.write(line + '\n');
};

const log = createDebug('keepai:electron');

const BASE_URL = `http://127.0.0.1:${DEFAULT_PORT}`;

const autoLaunchPrefPath = path.join(keepaiDir, 'auto-launch.json');

function getAutoLaunchPref(): boolean {
  try {
    return JSON.parse(fs.readFileSync(autoLaunchPrefPath, 'utf-8')).enabled === true;
  } catch {
    return false;
  }
}

function setAutoLaunchPref(enabled: boolean) {
  fs.writeFileSync(autoLaunchPrefPath, JSON.stringify({ enabled }));
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,
    args: enabled ? ['--hidden'] : [],
  });
}

function applyAutoLaunch() {
  if (!app.isPackaged) return; // skip in dev mode
  if (!fs.existsSync(autoLaunchPrefPath)) {
    // First run — enable by default
    setAutoLaunchPref(true);
  } else {
    const enabled = getAutoLaunchPref();
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true,
      args: enabled ? ['--hidden'] : [],
    });
  }
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let server: KeepServer | null = null;
let sseCleanup: (() => void) | null = null;
let pendingCount = 0;
let isQuitting = false;
let accessToken = '';

// --- Window ---

function getUnpackedPath(relativePath: string): string {
  let p = path.join(__dirname, '..', 'build', relativePath);
  if (app.isPackaged) {
    p = p.replace('app.asar', 'app.asar.unpacked');
  }
  return p;
}

function createWindow() {
  const iconExt = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  const iconPath = getUnpackedPath(iconExt);
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    icon: fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(BASE_URL);

  mainWindow.once('ready-to-show', () => {
    // Stay hidden if launched as login item (auto-start)
    const isHiddenLaunch =
      app.getLoginItemSettings().wasOpenedAsHidden ||
      process.argv.includes('--hidden');
    if (!isHiddenLaunch) {
      mainWindow?.show();
    }
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Block external navigation
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(BASE_URL)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// --- Tray ---

function createTray() {
  let trayIconName: string;
  if (process.platform === 'darwin') {
    trayIconName = 'tray-iconTemplate@2x.png';
  } else if (process.platform === 'win32') {
    trayIconName = 'tray-icon.ico';
  } else {
    trayIconName = 'tray-icon.png';
  }
  const trayIconPath = getUnpackedPath(trayIconName);
  const icon = fs.existsSync(trayIconPath)
    ? nativeImage.createFromPath(trayIconPath)
    : nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('KeepAI');
  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
}

function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open KeepAI',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: `Pending Approvals: ${pendingCount}`,
      enabled: pendingCount > 0,
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
        mainWindow?.webContents.send('navigate-to', '/approvals');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// --- SSE Notification Listener ---

function setupSSEListener() {
  // Electron 33 bundles Node ~20.x which lacks EventSource.
  // Use http.get to consume the SSE stream manually.
  const http = require('http');
  let closed = false;
  let req: any = null;

  function connect() {
    if (closed) return;
    req = http.get(`${BASE_URL}/api/events`, { headers: { Authorization: `Bearer ${accessToken}` } }, (res: any) => {
      let buffer = '';
      let currentEvent = '';

      res.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const dataStr = line.slice(5).trim();
            handleSSEEvent(currentEvent, dataStr);
            currentEvent = '';
          } else if (line === '') {
            currentEvent = '';
          }
        }
      });

      res.on('end', () => {
        // Reconnect after a short delay
        if (!closed) setTimeout(connect, 3000);
      });

      res.on('error', () => {
        if (!closed) setTimeout(connect, 3000);
      });
    });

    req.on('error', () => {
      if (!closed) setTimeout(connect, 3000);
    });
  }

  connect();

  return () => {
    closed = true;
    req?.destroy();
  };
}

function handleSSEEvent(event: string, dataStr: string) {
  if (event === 'approval_request') {
    try {
      const data = JSON.parse(dataStr);
      pendingCount = data.pendingCount ?? pendingCount + 1;
      updateTrayMenu();

      if (Notification.isSupported()) {
        const notification = new Notification({
          title: `${data.agentName || 'Agent'} to ${(data.service || 'Unknown').charAt(0).toUpperCase() + (data.service || 'unknown').slice(1)}${data.accountId ? ` (${data.accountId})` : ''}`,
          body: data.description || `Requests ${data.method} approval`,
          icon: getUnpackedPath('icon.png'),
        });

        notification.on('click', () => {
          mainWindow?.show();
          mainWindow?.focus();
          mainWindow?.webContents.send('navigate-to', '/approvals');
        });

        notification.show();
      }
    } catch {
      // Ignore parse errors
    }
  } else if (event === 'connection_updated') {
    try {
      const data = JSON.parse(dataStr);
      if (data.action === 'connected' && Notification.isSupported()) {
        const notification = new Notification({
          title: 'KeepAI',
          body: `${data.serviceName || data.service} connected`,
          icon: getUnpackedPath('icon.png'),
        });
        notification.on('click', () => {
          mainWindow?.show();
          mainWindow?.focus();
        });
        notification.show();
      }
    } catch {
      // Ignore parse errors
    }
  } else if (event === 'approval_resolved') {
    pendingCount = Math.max(0, pendingCount - 1);
    updateTrayMenu();
  }
}

// --- IPC Handlers ---

function setupIPC() {
  ipcMain.handle('get-version', () => app.getVersion());
  ipcMain.handle('get-platform', () => process.platform);
  ipcMain.handle('get-access-token', () => accessToken);

  ipcMain.handle('show-notification', (_event, options: { title: string; body: string }) => {
    if (Notification.isSupported()) {
      new Notification(options).show();
    }
  });

  ipcMain.handle('update-tray-badge', (_event, count: number) => {
    pendingCount = count;
    updateTrayMenu();
  });

  ipcMain.handle('open-external', (_event, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.handle('get-auto-launch', () => {
    return getAutoLaunchPref();
  });

  ipcMain.handle('set-auto-launch', (_event, enabled: boolean) => {
    setAutoLaunchPref(enabled);
  });
}

// --- App Lifecycle ---

(app as any).isQuitting = false;

app.whenReady().then(async () => {
  try {
    // 1. Start keepd server
    log('starting keepd server...');
    server = await createServer({
      port: DEFAULT_PORT,
      serveStaticFiles: true,
    });
    accessToken = server.accessToken;
    await server.listen();
    log('keepd listening on %s', BASE_URL);

    // 2. Create window
    createWindow();

    // 3. Application menu: hide entirely unless DEBUG is set
    if (process.env.DEBUG) {
      const defaultMenu = Menu.getApplicationMenu();
      if (defaultMenu) {
        const filtered = defaultMenu.items.filter((item) => item.role !== 'help');
        Menu.setApplicationMenu(Menu.buildFromTemplate(
          filtered.map((item) => ({ role: item.role as any, label: item.label, submenu: item.submenu as any }))
        ));
      }
    } else {
      Menu.setApplicationMenu(null);
      mainWindow?.removeMenu();
    }

    // 4. Create tray
    createTray();

    // 5. SSE listener for notifications
    sseCleanup = setupSSEListener();

    // 6. Setup IPC
    setupIPC();

    // 7. Hide macOS dock icon
    if (process.platform === 'darwin') {
      app.dock?.hide();
    }

    // 8. Enable auto-launch on first run + apply setting
    applyAutoLaunch();

    // 9. Auto-update (packaged builds only)
    if (app.isPackaged) {
      autoUpdater.logger = {
        info: (...args: any[]) => log('updater: %s', args.join(' ')),
        warn: (...args: any[]) => log('updater warn: %s', args.join(' ')),
        error: (...args: any[]) => log('updater error: %s', args.join(' ')),
        debug: (...args: any[]) => log('updater debug: %s', args.join(' ')),
      };
      autoUpdater.checkForUpdatesAndNotify({
        title: 'KeepAI Update',
        body: 'A new version of KeepAI has been downloaded and will be installed on restart.',
      }).catch((err) => {
        log('update check failed (expected if no releases exist yet): %O', err);
      });
    }
  } catch (err) {
    log('startup failed: %O', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // Don't quit when all windows closed (tray app)
  if (process.platform !== 'darwin') {
    // On non-macOS, keep running in tray
  }
});

app.on('activate', () => {
  // macOS: re-create window when dock icon clicked
  if (!mainWindow) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', async () => {
  isQuitting = true;
  sseCleanup?.();
  if (server) {
    log('shutting down keepd...');
    await server.close();
  }
});
