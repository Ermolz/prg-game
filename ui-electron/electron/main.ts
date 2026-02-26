import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { EngineInstance } from './rpc/EngineInstance';
import { botMoveUnified } from './rpc/orchestrator';
import type { DabSettings, LogEntry } from './rpc/types';
import { DEFAULT_SETTINGS } from './rpc/types';

let mainWindow: BrowserWindow | null = null;
let settings: DabSettings = { ...DEFAULT_SETTINGS };
let gameEngine: EngineInstance | null = null;
let botEngine: EngineInstance | null = null;

function sendLog(entry: LogEntry): void {
  if (settings.logsEnabled && mainWindow) {
    mainWindow.webContents.send('dab:log', entry);
  }
}

function getOrCreateGameEngine(): EngineInstance {
  if (!gameEngine) {
    gameEngine = new EngineInstance('game', settings.gameEngine, sendLog);
  }
  return gameEngine;
}

function getOrCreateBotEngine(): EngineInstance {
  if (!botEngine) {
    botEngine = new EngineInstance('bot', settings.botEngine, sendLog);
  }
  return botEngine;
}

function restartAll(): void {
  gameEngine?.stop();
  botEngine?.stop();
  gameEngine = null;
  botEngine = null;
}

function createWindow(): void {
  const isDev = !app.isPackaged;
  const preloadPath = path.join(__dirname, 'preload.js');
  const loadBuilt =
    isDev && (process.env.ELECTRON_LOAD_BUILT === '1' || process.env.USE_FILE_LOAD === '1');
  const loadUrl = isDev
    ? loadBuilt
      ? pathToFileURL(
          path.resolve(app.getAppPath(), 'dist-renderer', 'index.html')
        ).href
      : 'http://127.0.0.1:5173'
    : `file://${path.join(__dirname, '..', 'dist-renderer', 'index.html')}`;

  const isFileUrl = loadUrl.startsWith('file:');
  const disableWebSecurity = isDev && isFileUrl;

  mainWindow = new BrowserWindow({
    width: 720,
    height: 560,
    title: 'Dots and Boxes (Electron)',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !disableWebSecurity,
    },
  });

  mainWindow.loadURL(loadUrl);
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  restartAll();
  app.quit();
});

ipcMain.handle('dab:getSettings', async () => settings);

ipcMain.handle('dab:setSettings', async (_, newSettings: DabSettings) => {
  settings = { ...newSettings };
  restartAll();
});

ipcMain.handle('dab:rpcGame', async (_, method: string, params: Record<string, unknown>) => {
  const engine = getOrCreateGameEngine();
  engine.start();
  return engine.request(method, params);
});

ipcMain.handle('dab:rpcBot', async (_, method: string, params: Record<string, unknown>) => {
  const engine = getOrCreateBotEngine();
  engine.start();
  return engine.request(method, params);
});

ipcMain.handle(
  'dab:botMoveUnified',
  async (
    _,
    params: { nx: number; ny: number; history: { a: { x: number; y: number }; b: { x: number; y: number } }[] }
  ) => {
    const game = getOrCreateGameEngine();
    const bot = getOrCreateBotEngine();
    game.start();
    bot.start();
    return botMoveUnified(game, bot, params);
  }
);

ipcMain.handle('dab:restartEngines', async () => {
  restartAll();
});

ipcMain.handle('dab:clearLogs', async () => {
  /* no-op: renderer clears its own buffer */
});

ipcMain.handle('dab:rpc', async (_, method: string, params: Record<string, unknown>) => {
  const engine = getOrCreateGameEngine();
  engine.start();
  return engine.request(method, params);
});

ipcMain.handle('dab:setEngine', async () => {
  getOrCreateGameEngine().start();
});

ipcMain.handle('dab:restartEngine', async () => {
  restartAll();
});

ipcMain.handle('dab:getEngineStatus', async () => {
  return 'ready';
});
