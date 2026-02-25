import { contextBridge, ipcRenderer } from 'electron';

const dab = {
  setEngine: (engineName: string) => ipcRenderer.invoke('dab:setEngine', engineName),
  newGame: (nx: number, ny: number) => ipcRenderer.invoke('dab:rpc', 'init', { nx, ny }),
  applyMove: (_s: unknown, edge: { a: { x: number; y: number }; b: { x: number; y: number } }) =>
    ipcRenderer.invoke('dab:rpc', 'applyMove', { edge }),
  possibleMoves: () => ipcRenderer.invoke('dab:rpc', 'possibleMoves', {}),
  botMove: () => ipcRenderer.invoke('dab:rpc', 'botMove', {}),
  gameOver: () => ipcRenderer.invoke('dab:rpc', 'gameOver', {}),
  getEngineStatus: () => ipcRenderer.invoke('dab:getEngineStatus') as Promise<string>,
  onEngineStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('dab:engineStatus', (_e, status: string) => callback(status));
  },
  restartEngine: () => ipcRenderer.invoke('dab:restartEngine'),
};

contextBridge.exposeInMainWorld('dab', dab);
