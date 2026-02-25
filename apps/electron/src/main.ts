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
  // Node 22+ has native EventSource
  const source = new EventSource(`${BASE_URL}/api/events`);

  source.addEventListener('approval_request', (event: any) => {
    try {
      const data = JSON.parse(event.data);
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
  });

  source.addEventListener('approval_resolved', () => {
    pendingCount = Math.max(0, pendingCount - 1);
    updateTrayMenu();
  });

  source.onerror = () => {
    // EventSource auto-reconnects
  };

  return () => {
    source.close();
  };
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
    console.log('[electron] Starting keepd server...');
    server = await createServer({
      port: PORT,
      serveStaticFiles: true,
    });
    await server.listen();
    console.log(`[electron] keepd listening on ${BASE_URL}`);

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
    console.error('[electron] Startup failed:', err);
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
    console.log('[electron] Shutting down keepd...');
    await server.close();
  }
});
