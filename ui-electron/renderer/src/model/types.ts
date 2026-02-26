import type { DabSettings, LogEntry } from './settings';

export type Point = { x: number; y: number };
export type Edge = { a: Point; b: Point };
export type Box = { x: number; y: number };

export type State = {
  nx: number;
  ny: number;
  edges: Edge[];
  s1: number;
  s2: number;
  player: number;
};

export type ApplyMoveResponse = { state: State; closedBoxes: Box[]; extraTurn: boolean };
export type BotMoveResponse = { move: Edge; reason: string; state: State };
export type GameOverResponse = { gameOver: boolean };

export type EngineStatus = 'starting' | 'ready' | 'down' | 'restarting';

export type BotMoveUnifiedParams = { nx: number; ny: number; history: Edge[] };
export type BotMoveUnifiedResult = ApplyMoveResponse & { move: Edge };

export interface DabApi {
  setEngine: (engineName: string) => Promise<void>;
  newGame: (nx: number, ny: number) => Promise<{ state: State }>;
  applyMove: (state: State, edge: Edge) => Promise<ApplyMoveResponse>;
  possibleMoves: (state: State) => Promise<{ edges: Edge[] }>;
  botMove: (state: State) => Promise<BotMoveResponse>;
  botMoveUnified: (params: BotMoveUnifiedParams) => Promise<BotMoveUnifiedResult>;
  gameOver: (state: State) => Promise<GameOverResponse>;
  getEngineStatus: () => Promise<EngineStatus>;
  onEngineStatus: (callback: (status: EngineStatus) => void) => void;
  restartEngine: () => Promise<void>;
  setSettings: (settings: DabSettings) => Promise<void>;
  getSettings: () => Promise<DabSettings>;
  onLog: (callback: (entry: LogEntry) => void) => void;
  clearLogs?: () => Promise<void>;
}

declare global {
  interface Window {
    dab: DabApi;
  }
}

export {};
