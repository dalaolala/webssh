const { contextBridge, shell, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  openExternal: (url) => shell.openExternal(url),
  getBackendPort: () => ipcRenderer.invoke('get-backend-port'),
  
  // 显示保存对话框
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  
  // 显示打开目录对话框
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options)
});
