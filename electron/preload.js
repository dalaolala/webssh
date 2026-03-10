const { contextBridge, shell, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  openExternal: (url) => shell.openExternal(url),
  getBackendPort: () => ipcRenderer.invoke('get-backend-port')
});
