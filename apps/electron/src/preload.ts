/**
 * @keepai/electron — Preload script.
 *
 * Exposes a minimal API to the renderer process via contextBridge.
 * No Node.js APIs are exposed directly — only IPC-based methods.
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expose environment info
contextBridge.exposeInMainWorld('env', {
  API_ENDPOINT: 'http://127.0.0.1:9090',
  NODE_ENV: process.env.NODE_ENV || 'production',
});

// Expose Electron API
contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  getPlatform: () => process.platform,

  onNavigateTo: (callback: (path: string) => void) => {
    const handler = (_event: any, path: string) => callback(path);
    ipcRenderer.on('navigate-to', handler);
    return () => {
      ipcRenderer.removeListener('navigate-to', handler);
    };
  },

  showNotification: (options: { title: string; body: string }) =>
    ipcRenderer.invoke('show-notification', options),

  updateTrayBadge: (count: number) =>
    ipcRenderer.invoke('update-tray-badge', count),

  openExternal: (url: string) =>
    ipcRenderer.invoke('open-external', url),

  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch') as Promise<boolean>,
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('set-auto-launch', enabled),
  getAccessToken: () => ipcRenderer.invoke('get-access-token') as Promise<string>,
});
