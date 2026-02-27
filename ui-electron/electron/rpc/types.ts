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

/** Minimal edge shape for orchestrator (same as renderer Edge) */
export type Edge = { a: { x: number; y: number }; b: { x: number; y: number } };

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

/** JSON-RPC request sent to engine stdin */
export interface RpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

/** JSON-RPC success response from engine stdout */
export interface RpcSuccessResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  result: T;
}

/** JSON-RPC error response */
export interface RpcErrorResponse {
  jsonrpc: '2.0';
  id: number;
  error: { code: number; message: string };
}

export type RpcResponse<T = unknown> = RpcSuccessResponse<T> | RpcErrorResponse;

export function isRpcError(r: RpcResponse): r is RpcErrorResponse {
  return 'error' in r;
}
