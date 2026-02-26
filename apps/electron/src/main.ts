/**
 * @keepai/electron — Electron main process.
 *
 * Startup sequence:
 * 1. Start keepd server on port 9090
 * 2. Create browser window (loads http://127.0.0.1:9090)
 * 3. Create tray icon with context menu
 * 4. Listen to SSE for desktop notifications
 * 5. Hide macOS dock icon
 */

// Electron 33's Node.js 20 lacks global WebSocket — polyfill before nostr-tools loads
import WebSocket from 'ws';
if (!globalThis.WebSocket) {
  (globalThis as any).WebSocket = WebSocket;
}

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

// Enable all keepai debug logs by default in electron
if (!process.env.DEBUG) {
  createDebug.enable('keepai:*');
}

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

const PORT = 9090;
const BASE_URL = `http://127.0.0.1:${PORT}`;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let server: KeepServer | null = null;
let sseCleanup: (() => void) | null = null;
let pendingCount = 0;
let isQuitting = false;

// --- Window ---

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(BASE_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
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
  // Use a simple 16x16 image; on macOS, use Template image for dark/light mode
  const icon = nativeImage.createEmpty();
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
    req = http.get(`${BASE_URL}/api/events`, (res: any) => {
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
          title: 'KeepAI — Approval Required',
          body: data.description || `${data.agentName || 'Agent'} requests approval`,
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
  } else if (event === 'approval_resolved') {
    pendingCount = Math.max(0, pendingCount - 1);
    updateTrayMenu();
  }
}

// --- IPC Handlers ---

function setupIPC() {
  ipcMain.handle('get-version', () => app.getVersion());
  ipcMain.handle('get-platform', () => process.platform);

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
}

// --- App Lifecycle ---

(app as any).isQuitting = false;

app.whenReady().then(async () => {
  try {
    // 1. Start keepd server
    log('starting keepd server...');
    server = await createServer({
      port: PORT,
      serveStaticFiles: true,
    });
    await server.listen();
    log('keepd listening on %s', BASE_URL);

    // 2. Create window
    createWindow();

    // 3. Create tray
    createTray();

    // 4. SSE listener for notifications
    sseCleanup = setupSSEListener();

    // 5. Setup IPC
    setupIPC();

    // 6. Hide macOS dock icon (tray-only app)
    if (process.platform === 'darwin') {
      app.dock?.hide();
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
