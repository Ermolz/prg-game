import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { EngineInstance, type EngineStatus } from './rpc/EngineInstance';
import { botMoveUnified } from './rpc/orchestrator';
import type { DabSettings, LogEntry } from './rpc/types';
import { DEFAULT_SETTINGS } from './rpc/types';

let mainWindow: BrowserWindow | null = null;
let settings: DabSettings = { ...DEFAULT_SETTINGS };
let gameEngine: EngineInstance | null = null;
let botEngine: EngineInstance | null = null;
let gameEngineStatus: EngineStatus = 'down';
let botEngineStatus: EngineStatus = 'down';

function sendLog(entry: LogEntry): void {
  if (settings.logsEnabled && mainWindow) {
    mainWindow.webContents.send('dab:log', entry);
  }
}

function sendGameEngineStatus(s: EngineStatus): void {
  gameEngineStatus = s;
  if (mainWindow) mainWindow.webContents.send('dab:gameEngineStatus', s);
}

function sendBotEngineStatus(s: EngineStatus): void {
  botEngineStatus = s;
  if (mainWindow) mainWindow.webContents.send('dab:botEngineStatus', s);
}

function getOrCreateGameEngine(): EngineInstance {
  if (!gameEngine) {
    gameEngine = new EngineInstance(
      'game',
      settings.gameEngine,
      sendLog,
      sendGameEngineStatus
    );
  }
  return gameEngine;
}

function getOrCreateBotEngine(): EngineInstance {
  if (!botEngine) {
    botEngine = new EngineInstance(
      'bot',
      settings.botEngine,
      sendLog,
      sendBotEngineStatus
    );
  }
  return botEngine;
}

function restartAll(): void {
  gameEngine?.stop();
  botEngine?.stop();
  gameEngine = null;
  botEngine = null;
  sendGameEngineStatus('down');
  sendBotEngineStatus('down');
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

ipcMain.handle('dab:setSettings', async (_, newSettings: Partial<DabSettings>) => {
  settings = { ...DEFAULT_SETTINGS, ...newSettings };
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
  sendGameEngineStatus('restarting');
  sendBotEngineStatus('restarting');
  restartAll();
});

type EdgeLike = { a: { x: number; y: number }; b: { x: number; y: number } };

ipcMain.handle(
  'dab:replay',
  async (
    _,
    params: { nx: number; ny: number; history: EdgeLike[] }
  ): Promise<{ state: unknown; boxOwners: Record<string, number>; gameOver: boolean }> => {
    const game = getOrCreateGameEngine();
    game.start();
    let res: { state: unknown; closedBoxes?: { x: number; y: number }[]; extraTurn?: boolean } =
      await game.request('init', { nx: params.nx, ny: params.ny });
    let state = res.state as { player: number };
    const boxOwners: Record<string, number> = {};
    for (const edge of params.history) {
      const r = await game.request<typeof res>('applyMove', { edge });
      state = r.state as { player: number };
      if (r.closedBoxes?.length) {
        const whoClosed = r.extraTurn ? state.player : 3 - state.player;
        for (const b of r.closedBoxes) {
          boxOwners[`${b.x},${b.y}`] = whoClosed;
        }
      }
    }
    const go = await game.request<{ gameOver: boolean }>('gameOver', {});
    return { state, boxOwners, gameOver: go.gameOver };
  }
);

export type SaveGameData = {
  version: number;
  nx: number;
  ny: number;
  moveHistory: EdgeLike[];
  timestamp: string;
  settings?: Partial<DabSettings>;
};

ipcMain.handle('dab:saveGame', async (_, data: SaveGameData): Promise<{ path: string } | { error: string }> => {
  if (!mainWindow) return { error: 'No window' };
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save game',
    defaultPath: `dab-${Date.now()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { error: 'Canceled' };
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { path: filePath };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
});

ipcMain.handle('dab:loadGame', async (): Promise<SaveGameData | { error: string }> => {
  if (!mainWindow) return { error: 'No window' };
  const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
    title: 'Load game',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return { error: 'Canceled' };
  try {
    const raw = await fs.readFile(filePaths[0], 'utf-8');
    const data = JSON.parse(raw) as SaveGameData;
    if (data.version !== 1 || typeof data.nx !== 'number' || typeof data.ny !== 'number' || !Array.isArray(data.moveHistory)) {
      return { error: 'Invalid save format' };
    }
    return data;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
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

ipcMain.handle('dab:getEngineStatus', async () => gameEngineStatus);
ipcMain.handle('dab:getGameEngineStatus', async () => gameEngineStatus);
ipcMain.handle('dab:getBotEngineStatus', async () => botEngineStatus);
