import { contextBridge, ipcRenderer } from 'electron';

type Edge = { a: { x: number; y: number }; b: { x: number; y: number } };

const dab = {
  setEngine: (engineName: string) => ipcRenderer.invoke('dab:setEngine', engineName),
  newGame: (nx: number, ny: number) =>
    ipcRenderer.invoke('dab:rpcGame', 'init', { nx, ny }),
  applyMove: (_s: unknown, edge: Edge) =>
    ipcRenderer.invoke('dab:rpcGame', 'applyMove', { edge }),
  possibleMoves: () => ipcRenderer.invoke('dab:rpcGame', 'possibleMoves', {}),
  botMove: () => ipcRenderer.invoke('dab:rpcBot', 'botMove', {}),
  botMoveUnified: (params: { nx: number; ny: number; history: Edge[] }) =>
    ipcRenderer.invoke('dab:botMoveUnified', params),
  gameOver: () => ipcRenderer.invoke('dab:rpcGame', 'gameOver', {}),
  replay: (params: { nx: number; ny: number; history: Edge[] }) =>
    ipcRenderer.invoke('dab:replay', params),
  saveGame: (data: unknown) => ipcRenderer.invoke('dab:saveGame', data),
  loadGame: () => ipcRenderer.invoke('dab:loadGame'),
  getEngineStatus: () => ipcRenderer.invoke('dab:getEngineStatus') as Promise<string>,
  getGameEngineStatus: () => ipcRenderer.invoke('dab:getGameEngineStatus') as Promise<string>,
  getBotEngineStatus: () => ipcRenderer.invoke('dab:getBotEngineStatus') as Promise<string>,
  onEngineStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('dab:engineStatus', (_e, status: string) => callback(status));
  },
  onGameEngineStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('dab:gameEngineStatus', (_e, status: string) => callback(status));
  },
  onBotEngineStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('dab:botEngineStatus', (_e, status: string) => callback(status));
  },
  restartEngine: () => ipcRenderer.invoke('dab:restartEngine'),
  restartEngines: () => ipcRenderer.invoke('dab:restartEngines'),
  setSettings: (settings: unknown) => ipcRenderer.invoke('dab:setSettings', settings),
  getSettings: () => ipcRenderer.invoke('dab:getSettings'),
  onLog: (callback: (entry: unknown) => void) => {
    ipcRenderer.on('dab:log', (_e, entry: unknown) => callback(entry));
  },
  clearLogs: () => ipcRenderer.invoke('dab:clearLogs'),
};

contextBridge.exposeInMainWorld('dab', dab);
