'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dconnect', {
  state: () => ipcRenderer.invoke('app:state'),
  agent: () => ipcRenderer.invoke('app:agent'),
  startUpdate: () => ipcRenderer.send('update:start'),
  onLine: (fn) => ipcRenderer.on('update:line', (_e, p) => fn(p.line)),
  onDone: (fn) => ipcRenderer.on('update:done', (_e, p) => fn(p.version)),
  onFailed: (fn) => ipcRenderer.on('update:failed', (_e, p) => fn(p.code)),
});
