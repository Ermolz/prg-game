export type EngineKind = 'csharp' | 'python' | 'java' | 'prolog';

export interface DabSettings {
  gameEngine: EngineKind;
  botEngine: EngineKind;
  logsEnabled: boolean;
  logsVerbose: boolean;
}

export const DEFAULT_SETTINGS: DabSettings = {
  gameEngine: 'csharp',
  botEngine: 'csharp',
  logsEnabled: false,
  logsVerbose: false,
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
