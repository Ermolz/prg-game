import { spawn, ChildProcess } from 'child_process';
import type { EngineKind, LogEntry } from './types';
import { getSpawnArgs } from './spawnArgs';
import { isRpcError, type RpcResponse } from './types';

export type EngineStatus = 'starting' | 'ready' | 'down' | 'restarting';

const RPC_TIMEOUT_MS = 10000;
const HEADER_END = Buffer.from('\r\n\r\n', 'ascii');

type PendingEntry = {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  timer?: ReturnType<typeof setTimeout>;
  startMs: number;
};

function parseContentLengthFrames(
  bufferRef: { current: Buffer },
  data: Buffer
): { messages: string[]; remainder: Buffer } {
  const messages: string[] = [];
  let buf = Buffer.concat([bufferRef.current, data]);
  bufferRef.current = Buffer.alloc(0);

  while (buf.length >= 4) {
    const idx = buf.indexOf(HEADER_END);
    if (idx < 0) {
      bufferRef.current = buf;
      break;
    }
    const header = buf.subarray(0, idx).toString('ascii');
    const match = /Content-Length:\s*(\d+)/i.exec(header);
    if (!match) {
      buf = buf.subarray(idx + HEADER_END.length);
      continue;
    }
    const len = parseInt(match[1], 10);
    const bodyStart = idx + HEADER_END.length;
    if (buf.length < bodyStart + len) {
      bufferRef.current = buf;
      break;
    }
    const body = buf.subarray(bodyStart, bodyStart + len).toString('utf8');
    messages.push(body);
    buf = buf.subarray(bodyStart + len);
  }
  if (buf.length > 0 && buf !== bufferRef.current) bufferRef.current = buf;

  return { messages, remainder: bufferRef.current };
}

function writeContentLengthFrame(
  stdin: NodeJS.WritableStream,
  body: string,
  cb: (err?: Error | null) => void
): void {
  const bodyBytes = Buffer.from(body, 'utf8');
  const header = `Content-Length: ${bodyBytes.length}\r\n\r\n`;
  const payload = Buffer.concat([Buffer.from(header, 'ascii'), bodyBytes]);
  stdin.write(payload, cb);
}

export class EngineInstance {
  private readonly scope: 'game' | 'bot';
  private readonly engineKind: EngineKind;
  private readonly onLog: ((entry: LogEntry) => void) | undefined;
  private readonly onStatusChange: ((status: EngineStatus) => void) | undefined;
  private childProc: ChildProcess | null = null;
  private readonly pending = new Map<number, PendingEntry>();
  private nextId = 1;
  private readonly bufferRef = { current: Buffer.alloc(0) };
  private readySent = false;

  constructor(
    scope: 'game' | 'bot',
    engineKind: EngineKind,
    onLog?: (entry: LogEntry) => void,
    onStatusChange?: (status: EngineStatus) => void
  ) {
    this.scope = scope;
    this.engineKind = engineKind;
    this.onLog = onLog;
    this.onStatusChange = onStatusChange;
  }

  private log(entry: Omit<LogEntry, 'ts' | 'scope' | 'engine'>): void {
    this.onLog?.({
      ...entry,
      ts: Date.now(),
      scope: this.scope,
      engine: this.engineKind,
    });
  }

  start(): void {
    if (this.childProc) return;
    this.readySent = false;
    this.onStatusChange?.('starting');
    const { command, args, cwd } = getSpawnArgs(this.engineKind);
    this.childProc = spawn(command, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });

    this.bufferRef.current = Buffer.alloc(0);
    this.childProc.stdout?.on('data', (chunk: Buffer) => {
      const { messages } = parseContentLengthFrames(
        this.bufferRef,
        Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      );
      for (const body of messages) {
        try {
          const msg = JSON.parse(body) as RpcResponse;
          const id = msg.id;
          if (id !== undefined && this.pending.has(id)) {
            const entry = this.pending.get(id)!;
            this.pending.delete(id);
            if (entry.timer) clearTimeout(entry.timer);
            const ms = Date.now() - entry.startMs;
            if (isRpcError(msg)) {
              this.log({ dir: 'res', id, ok: false, ms, data: msg.error });
              entry.reject(new Error(msg.error.message ?? JSON.stringify(msg.error)));
            } else {
              if (!this.readySent) {
                this.readySent = true;
                this.onStatusChange?.('ready');
              }
              this.log({ dir: 'res', id, ok: true, ms, data: msg.result });
              entry.resolve(msg.result);
            }
          }
        } catch {
          console.error(`[engine:${this.scope}] parse:`, body.slice(0, 100));
        }
      }
    });

    this.childProc.stderr?.on('data', (d: Buffer) => {
      const lines = d.toString('utf8').split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        this.log({ dir: 'stderr', data: line });
      }
      process.stderr?.write(d);
    });

    this.childProc.on('exit', (code) => {
      if (code !== 0 && code !== null) console.error(`[engine:${this.scope}] exit:`, code);
      this.childProc = null;
      this.readySent = false;
      this.onStatusChange?.('down');
      this.pending.forEach((entry) => {
        if (entry.timer) clearTimeout(entry.timer);
        entry.reject(new Error('Engine stopped'));
      });
      this.pending.clear();
    });
  }

  stop(): void {
    if (this.childProc) {
      this.childProc.kill();
      this.childProc = null;
    }
    this.pending.forEach((entry) => {
      if (entry.timer) clearTimeout(entry.timer);
      entry.reject(new Error('Engine stopped'));
    });
    this.pending.clear();
  }

  async request<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.childProc?.stdin?.writable) {
      this.start();
      if (!this.childProc?.stdin?.writable) {
        throw new Error('Engine not running');
      }
    }
    const id = this.nextId++;
    const startMs = Date.now();
    this.log({ dir: 'req', method, id, data: params });

    return new Promise<T>((resolve, reject) => {
      const entry: PendingEntry = {
        resolve: resolve as (v: unknown) => void,
        reject,
        timer: undefined,
        startMs,
      };
      this.pending.set(id, entry);
      const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });
      writeContentLengthFrame(this.childProc!.stdin!, body, (err) => {
        if (err) {
          this.pending.delete(id);
          reject(err);
          return;
        }
        entry.timer = setTimeout(() => {
          if (!this.pending.has(id)) return;
          this.pending.delete(id);
          reject(new Error('Request timed out'));
          this.stop();
        }, RPC_TIMEOUT_MS);
      });
    });
  }
}
