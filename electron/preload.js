const { contextBridge, shell } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  openExternal: (url) => shell.openExternal(url)
});
