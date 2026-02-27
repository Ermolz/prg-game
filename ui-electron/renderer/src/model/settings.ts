export type EngineKind = 'csharp' | 'python' | 'java' | 'prolog';

export type GameMode = 'PvP' | 'PvE' | 'EvE';

export type LogsLayout = 'bottom' | 'drawer';

export interface DabSettings {
  gameEngine: EngineKind;
  botEngine: EngineKind;
  gameMode: GameMode;
  defaultNx: number;
  defaultNy: number;
  logsEnabled: boolean;
  verboseLogs: boolean;
  autoScrollLogs: boolean;
  logsLayout: LogsLayout;
}

export const DEFAULT_SETTINGS: DabSettings = {
  gameEngine: 'csharp',
  botEngine: 'csharp',
  gameMode: 'PvE',
  defaultNx: 2,
  defaultNy: 2,
  logsEnabled: false,
  verboseLogs: false,
  autoScrollLogs: true,
  logsLayout: 'bottom',
};

export type LogEntry = {
  ts: number;
  scope: 'game' | 'bot';
  engine: EngineKind;
  dir: 'req' | 'res' | 'stderr';
  method?: string;
  id?: number;
  ok?: boolean;
  ms?: number;
  data: unknown;
};
