# 08 - Electron Desktop App

## Overview

The KeepAI desktop app packages keepd + ui into an Electron application.
It runs in the background (system tray), manages the daemon lifecycle, and provides
native OS integrations (notifications, global shortcuts).

## Source: What to Reuse from ../keep.ai

### Copy from `apps/electron/`:
- `src/main.ts` — Main process (adapt heavily, ~50% reusable)
  - Keep: window creation, tray management, preload setup, security settings,
    menu setup, protocol handling, external URL blocking
  - Remove: all agent/workflow/automation-related code, QuickJS references
  - Add: approval notification handling, agent activity indicators
- `src/preload.ts` — Preload script (adapt: change exposed APIs)
- `esbuild.main.mjs` — Build script (adapt: change external modules list)
- `package.json` — Dependencies (adapt: change deps)

### Copy from root:
- `electron-builder.yml` — Packaging config (adapt: new app ID, native modules)

## Main Process

### Startup Sequence

```typescript
app.whenReady().then(async () => {
  // 1. Start keepd server
  const server = await createServer({
    port: 28417,           // Fixed port (registered as OAuth redirect URI)
    host: "127.0.0.1",
    serveStaticFiles: true,
    staticFilesRoot: path.join(__dirname, "../public"),
  });
  const { port } = await server.listen();

  // 2. Set API endpoint for renderer
  process.env.API_ENDPOINT = `http://127.0.0.1:${port}/api`;

  // 3. Create browser window (hidden initially)
  createWindow(port);

  // 4. Create tray icon
  createTray(port);

  // 5. Set up SSE listener for desktop notifications
  setupNotificationListener(port);

  // 6. Hide dock icon on macOS (tray-only app)
  if (process.platform === "darwin") {
    app.dock.hide();
  }
});
```

### Window Management

Same pattern as ../keep.ai:
- 1000x700 BrowserWindow
- Loads `http://127.0.0.1:{port}` (HTTP for OAuth origin requirements)
- Context isolation enabled, nodeIntegration disabled
- Close → minimize to tray (not quit)
- Preload script bridges main ↔ renderer

### Tray

```typescript
function createTray(port: number) {
  const tray = new Tray(iconPath);

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open KeepAI", click: () => showWindow() },
    { type: "separator" },
    { label: "Pending Approvals: 0", enabled: false, id: "approvals" },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]));

  // Single click toggles window
  tray.on("click", () => toggleWindow());
}
```

Tray badge: shows count of pending approvals (updated via SSE listener).

### Desktop Notifications

Main process listens to keepd's SSE endpoint for approval requests:

```typescript
function setupNotificationListener(port: number) {
  const source = new EventSource(`http://127.0.0.1:${port}/api/events`);

  source.addEventListener("approval_request", (event) => {
    const data = JSON.parse(event.data);

    const notification = new Notification({
      title: `${data.agentName} needs approval`,
      body: data.description,
      urgency: "critical",
    });

    notification.on("click", () => {
      showWindow();
      // Navigate to approvals page
      mainWindow.webContents.send("navigate-to", "/approvals");
    });

    notification.show();

    // Update tray badge
    updateTrayBadge(data.pendingCount);
  });
}
```

### Preload Script

```typescript
contextBridge.exposeInMainWorld("env", {
  API_ENDPOINT: process.env.API_ENDPOINT,
  NODE_ENV: process.env.NODE_ENV,
});

contextBridge.exposeInMainWorld("electronAPI", {
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  getPlatform: () => process.platform,

  // Navigation from main process
  onNavigateTo: (callback) => {
    ipcRenderer.on("navigate-to", (_, path) => callback(path));
    return () => ipcRenderer.removeListener("navigate-to", callback);
  },

  // Notification support
  showNotification: (options) =>
    ipcRenderer.invoke("show-notification", options),

  // Tray badge
  updateTrayBadge: (count) =>
    ipcRenderer.invoke("update-tray-badge", count),
});
```

## esbuild Configuration

```javascript
// esbuild.main.mjs
import esbuild from "esbuild";

const external = [
  "electron",
  "better-sqlite3",  // Native module — loaded at runtime from extraResources
];

// Build main process
await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: "dist/main.cjs",
  external,
});

// Build preload script
await esbuild.build({
  entryPoints: ["src/preload.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: "dist/preload.cjs",
  external: ["electron"],
});
```

## electron-builder.yml

```yaml
appId: ai.keepai.app
productName: KeepAI
asar: true

directories:
  output: apps/electron/release
  buildResources: apps/electron/build

extraMetadata:
  main: apps/electron/dist/main.cjs

files:
  - package.json
  - node_modules/**
  - apps/electron/dist/**
  - apps/electron/public/**
  - apps/keepd/dist/**
  - packages/*/dist/**
  # Exclude native modules from asar (they go to extraResources)
  - "!node_modules/better-sqlite3/**"
  - "!node_modules/bindings/**"

extraResources:
  # Native modules: better-sqlite3
  - from: node_modules/better-sqlite3
    to: node_modules/better-sqlite3
  - from: node_modules/bindings
    to: node_modules/bindings
  - from: node_modules/file-uri-to-path
    to: node_modules/file-uri-to-path

win:
  target: portable

mac:
  target: dmg

linux:
  target: AppImage
```

## Build Process

```bash
# 1. Build all packages
turbo run build

# 2. Copy ui into electron's public directory
cp -r apps/ui/dist/electron/* apps/electron/public/

# 3. Build electron main/preload
cd apps/electron && node esbuild.main.mjs

# 4. Package with electron-builder
npx electron-builder --config electron-builder.yml
```

Scripts in apps/electron/package.json:
```json
{
  "scripts": {
    "build:main": "node esbuild.main.mjs",
    "copy:frontend": "cp -r ../ui/dist/electron/* public/",
    "build:app": "npm run build:main && npm run copy:frontend",
    "dist": "cd ../.. && npx electron-builder --config electron-builder.yml",
    "dev": "npm run build:main && electron dist/main.cjs --dev"
  }
}
```

## OAuth in Electron

OAuth flows need special handling in electron:

1. User clicks "Connect Gmail" in ui
2. ui calls `POST /api/connections/gmail/connect` → gets `authUrl`
3. ui opens auth URL in external browser (not in electron window):
   ```typescript
   window.electronAPI.openExternal(authUrl);
   // Falls back to: window.open(authUrl) in non-electron
   ```
4. OAuth callback goes to `http://localhost:28417/api/connections/gmail/callback`
5. keepd handles callback, stores credentials
6. ui polls or gets SSE update that connection is established

keepd always uses port 28417 by default. OAuth redirect URIs are registered with
Google/Notion for `http://localhost:28417/api/connections/*/callback`. For Docker
deployments, the port is configurable via `KEEPAI_PORT` env var — users who change
the port must register their own OAuth app with the matching redirect URI.

## Security

Same as ../keep.ai:
- `contextIsolation: true`
- `nodeIntegration: false`
- Path traversal protection on file:// protocol
- External navigation blocked (only localhost allowed)
- Preload exposes minimal API surface

## Differences from ../keep.ai Electron App

| Aspect | keep.ai | KeepAI |
|--------|---------|--------|
| Embedded server | Full Fastify + agent + workflows | Lightweight keepd |
| Native modules | sqlite3, crsqlite, quickjs | better-sqlite3 only |
| Tray badge | Automations needing attention | Pending approval count |
| Global shortcut | Cmd+N (new automation) | None (or Cmd+Shift+K to open) |
| Notifications | Workflow errors/asks | Agent approval requests |
| Complexity | High (agent, scripts, sync) | Low (proxy + policies) |
