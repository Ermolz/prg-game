import { contextBridge, ipcRenderer } from 'electron';

const dab = {
  setEngine: (engineName: string) => ipcRenderer.invoke('dab:setEngine', engineName),
  newGame: (nx: number, ny: number) =>
    ipcRenderer.invoke('dab:rpcGame', 'init', { nx, ny }),
  applyMove: (_s: unknown, edge: { a: { x: number; y: number }; b: { x: number; y: number } }) =>
    ipcRenderer.invoke('dab:rpcGame', 'applyMove', { edge }),
  possibleMoves: () => ipcRenderer.invoke('dab:rpcGame', 'possibleMoves', {}),
  botMove: () => ipcRenderer.invoke('dab:rpcBot', 'botMove', {}),
  botMoveUnified: (params: { nx: number; ny: number; history: { a: { x: number; y: number }; b: { x: number; y: number } }[] }) =>
    ipcRenderer.invoke('dab:botMoveUnified', params),
  gameOver: () => ipcRenderer.invoke('dab:rpcGame', 'gameOver', {}),
  getEngineStatus: () => ipcRenderer.invoke('dab:getEngineStatus') as Promise<string>,
  onEngineStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('dab:engineStatus', (_e, status: string) => callback(status));
  },
  restartEngine: () => ipcRenderer.invoke('dab:restartEngine'),
  setSettings: (settings: unknown) => ipcRenderer.invoke('dab:setSettings', settings),
  getSettings: () => ipcRenderer.invoke('dab:getSettings'),
  onLog: (callback: (entry: unknown) => void) => {
    ipcRenderer.on('dab:log', (_e, entry: unknown) => callback(entry));
  },
  clearLogs: () => ipcRenderer.invoke('dab:clearLogs'),
};

contextBridge.exposeInMainWorld('dab', dab);
