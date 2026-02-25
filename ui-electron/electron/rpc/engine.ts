import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

const RPC_TIMEOUT_MS = 10000;

const UI_ELECTRON_ROOT = path.join(__dirname, '..', '..');
const REPO_ROOT = process.env.DAB_REPO_ROOT
  ? path.resolve(process.env.DAB_REPO_ROOT)
  : path.join(UI_ELECTRON_ROOT, '..');
const CLI_PROJECT = path.join(REPO_ROOT, 'src', 'csharp', 'DotsAndBoxes.Cli');
const CSHARP_ROOT = path.resolve(REPO_ROOT, 'src', 'csharp');

export type EngineStatus = 'starting' | 'ready' | 'down' | 'restarting';

let childProc: ChildProcess | null = null;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer?: ReturnType<typeof setTimeout> }>();
let nextId = 1;
let buffer = Buffer.alloc(0);
let engineStatus: EngineStatus = 'down';
let onStatusChange: ((status: EngineStatus) => void) | null = null;

function setStatus(s: EngineStatus): void {
  if (engineStatus === s) return;
  engineStatus = s;
  onStatusChange?.(s);
}

export function getEngineStatus(): EngineStatus {
  return engineStatus;
}

export function setOnStatusChange(cb: (status: EngineStatus) => void): void {
  onStatusChange = cb;
}

const HEADER_END = Buffer.from('\r\n\r\n', 'ascii');

function parseContentLengthFrames(data: Buffer): { messages: string[]; remainder: Buffer } {
  const messages: string[] = [];
  let buf = Buffer.concat([buffer, data]);
  buffer = Buffer.alloc(0);

  while (buf.length >= 4) {
    const idx = buf.indexOf(HEADER_END);
    if (idx < 0) {
      buffer = buf;
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
      buffer = buf;
      break;
    }
    const body = buf.subarray(bodyStart, bodyStart + len).toString('utf8');
    messages.push(body);
    buf = buf.subarray(bodyStart + len);
  }
  if (buf.length > 0 && buf !== buffer) buffer = buf;

  return { messages, remainder: buffer };
}

function getCliSpawnArgs(): { command: string; args: string[]; cwd: string } {
  const isWin = require('process').platform === 'win32';
  const { app } = require('electron');
  if (app.isPackaged && process.resourcesPath) {
    const cliDir = path.join(process.resourcesPath, 'cli');
    const exe = isWin ? 'DotsAndBoxes.Cli.exe' : 'DotsAndBoxes.Cli';
    const command = path.join(cliDir, exe);
    return { command, args: [], cwd: cliDir };
  }
  return {
    command: 'dotnet',
    args: ['run', '--project', CLI_PROJECT, '--no-build'],
    cwd: CSHARP_ROOT,
  };
}

export function startEngine(): void {
  if (childProc) return;
  setStatus('starting');
  const isWin = require('process').platform === 'win32';
  const { command, args, cwd } = getCliSpawnArgs();
  childProc = spawn(command, args, {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: false,
  });

  buffer = Buffer.alloc(0);
  childProc.stdout?.on('data', (chunk: Buffer) => {
    const { messages } = parseContentLengthFrames(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    for (const body of messages) {
      try {
        const msg = JSON.parse(body) as { id?: number; result?: unknown; error?: { message: string } };
        const id = msg.id;
        if (id !== undefined && pending.has(id)) {
          const entry = pending.get(id)!;
          pending.delete(id);
          if (entry.timer) clearTimeout(entry.timer);
          if (msg.error) entry.reject(new Error(msg.error.message ?? JSON.stringify(msg.error)));
          else {
            setStatus('ready');
            entry.resolve(msg.result);
          }
        }
      } catch {
        console.error('[engine] parse:', body.slice(0, 100));
      }
    }
  });

  childProc.stderr?.on('data', (d: Buffer) => process.stderr?.write(d));
  childProc.on('exit', (code) => {
    if (code !== 0 && code !== null) console.error('[engine] exit:', code);
    setStatus('down');
    pending.forEach((entry) => {
      if (entry.timer) clearTimeout(entry.timer);
      entry.reject(new Error('Engine stopped'));
    });
    pending.clear();
    childProc = null;
  });
}

export function stopEngine(): void {
  if (childProc) {
    childProc.kill();
    childProc = null;
  }
  setStatus('down');
  pending.forEach((entry) => {
    if (entry.timer) clearTimeout(entry.timer);
    entry.reject(new Error('Engine stopped'));
  });
  pending.clear();
}

function writeContentLengthFrame(stdin: NodeJS.WritableStream, body: string, cb: (err?: Error | null) => void): void {
  const bodyBytes = Buffer.from(body, 'utf8');
  const header = `Content-Length: ${bodyBytes.length}\r\n\r\n`;
  const payload = Buffer.concat([Buffer.from(header, 'ascii'), bodyBytes]);
  stdin.write(payload, cb);
}

function sendRequestInner<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!childProc?.stdin?.writable) {
      startEngine();
      if (!childProc?.stdin?.writable) {
        reject(new Error('Engine not running'));
        return;
      }
    }
    const id = nextId++;
    const entry = { resolve: resolve as (v: unknown) => void, reject, timer: undefined as ReturnType<typeof setTimeout> | undefined };
    pending.set(id, entry);
    const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    writeContentLengthFrame(childProc!.stdin!, body, (err) => {
      if (err) {
        pending.delete(id);
        reject(err);
        return;
      }
      entry.timer = setTimeout(() => {
        if (!pending.has(id)) return;
        pending.delete(id);
        reject(new Error('Request timed out'));
        stopEngine();
        setStatus('restarting');
        startEngine();
      }, RPC_TIMEOUT_MS);
    });
  });
}

export function sendRequest<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  return sendRequestInner<T>(method, params);
}
