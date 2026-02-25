import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { startEngine, stopEngine, sendRequest, getEngineStatus, setOnStatusChange } from './rpc/engine';

let mainWindow: BrowserWindow | null = null;

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

  setOnStatusChange((status) => {
    mainWindow?.webContents.send('dab:engineStatus', status);
  });

  mainWindow.loadURL(loadUrl);
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  stopEngine();
  app.quit();
});

ipcMain.handle('dab:rpc', async (_, method: string, params: Record<string, unknown>) => {
  return sendRequest(method, params);
});

ipcMain.handle('dab:setEngine', async (_, _engineName: string) => {
  startEngine();
});

ipcMain.handle('dab:restartEngine', async () => {
  stopEngine();
  startEngine();
});

ipcMain.handle('dab:getEngineStatus', async () => {
  return getEngineStatus();
});
