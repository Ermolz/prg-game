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
