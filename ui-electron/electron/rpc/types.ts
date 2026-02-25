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
