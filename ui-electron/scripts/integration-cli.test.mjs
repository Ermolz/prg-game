/**
 * Integration test for CLI JSON-RPC contract (Content-Length framing).
 * Scenarios: 1x1 close box, 2x1 two boxes one edge, botMove determinism, illegal move error.
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_ELECTRON = path.join(__dirname, '..');
const REPO_ROOT = process.env.DAB_REPO_ROOT
  ? path.resolve(process.env.DAB_REPO_ROOT)
  : path.join(UI_ELECTRON, '..');
const CLI_PROJECT = path.join(REPO_ROOT, 'src', 'csharp', 'DotsAndBoxes.Cli');
const CSHARP_ROOT = path.resolve(REPO_ROOT, 'src', 'csharp');

const HEADER_END = Buffer.from('\r\n\r\n', 'ascii');

function sendContentLength(cli, body) {
  const len = Buffer.byteLength(body, 'utf8');
  const header = `Content-Length: ${len}\r\n\r\n`;
  cli.stdin.write(header, 'ascii');
  cli.stdin.write(body, 'utf8');
}

function tryParseFrame(buf) {
  const idx = buf.indexOf(HEADER_END);
  if (idx < 0) return false;
  const header = buf.subarray(0, idx).toString('ascii');
  const match = /Content-Length:\s*(\d+)/i.exec(header);
  if (!match) throw new Error(`No Content-Length in header: ${header}`);
  const len = parseInt(match[1], 10);
  const bodyStart = idx + HEADER_END.length;
  if (buf.length < bodyStart + len) return false;
  return buf.subarray(bodyStart, bodyStart + len).toString('utf8');
}

function readNextFrame(cli) {
  return new Promise((resolve, reject) => {
    let buf = Buffer.alloc(0);
    let done = false;

    function cleanup() {
      cli.stdout.off('data', onData);
      cli.off('close', onClose);
    }

    function onData(chunk) {
      buf = Buffer.concat([buf, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
      try {
        const body = tryParseFrame(buf);
        if (body !== false) {
          done = true;
          cleanup();
          resolve(body);
        }
      } catch (e) {
        cleanup();
        reject(e);
      }
    }

    function onClose(code) {
      if (done) return;
      try {
        const body = tryParseFrame(buf);
        if (body !== false) {
          done = true;
          cleanup();
          resolve(body);
          return;
        }
      } catch (e) {
        cleanup();
        reject(e);
        return;
      }
      cleanup();
      reject(new Error(`CLI closed before full frame. code=${code}, bufLen=${buf.length}`));
    }

    cli.stdout.on('data', onData);
    cli.on('close', onClose);
  });
}

function nextId() {
  return Math.floor(Math.random() * 1e6) + 1;
}

async function rpc(cli, method, params) {
  const id = nextId();
  const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });
  sendContentLength(cli, body);
  const raw = await readNextFrame(cli);
  const msg = JSON.parse(raw);
  if (msg.id !== id) throw new Error(`id mismatch ${msg.id} !== ${id}`);
  if (msg.error) throw new Error(`RPC error: ${msg.error.message} (code ${msg.error.code})`);
  return msg.result;
}

const EDGES_1X1 = [
  { a: { x: 0, y: 0 }, b: { x: 1, y: 0 } },
  { a: { x: 0, y: 0 }, b: { x: 0, y: 1 } },
  { a: { x: 1, y: 0 }, b: { x: 1, y: 1 } },
  { a: { x: 0, y: 1 }, b: { x: 1, y: 1 } },
];

// 2x1: play (0,0)-(1,0), (0,1)-(1,1), (0,0)-(0,1), then (1,0)-(1,1) closes both boxes
const EDGES_2X1_LAST_TWO_BOXES = [
  { a: { x: 0, y: 0 }, b: { x: 1, y: 0 } },
  { a: { x: 0, y: 1 }, b: { x: 1, y: 1 } },
  { a: { x: 0, y: 0 }, b: { x: 0, y: 1 } },
  { a: { x: 1, y: 0 }, b: { x: 1, y: 1 } },
];

async function main() {
  const cli = spawn('dotnet', ['run', '--project', CLI_PROJECT, '--no-build'], {
    cwd: CSHARP_ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  cli.stderr.on('data', (d) => process.stderr.write(d));

  try {
    // --- Scenario 1: 1x1 single box close ---
    await rpc(cli, 'init', { nx: 1, ny: 1 });
    let lastResult;
    for (const edge of EDGES_1X1) {
      lastResult = await rpc(cli, 'applyMove', { edge });
    }
    if (!lastResult.closedBoxes || lastResult.closedBoxes.length !== 1) {
      throw new Error(`1x1: expected closedBoxes.length === 1, got ${lastResult.closedBoxes?.length}`);
    }
    if (lastResult.extraTurn !== true) {
      throw new Error(`1x1: expected extraTurn === true, got ${lastResult.extraTurn}`);
    }
    if (!lastResult.state || lastResult.state.player !== 2) {
      throw new Error(`1x1: expected state.player === 2, got ${lastResult.state?.player}`);
    }

    // --- Scenario 2: 2x1 two boxes with one edge ---
    await rpc(cli, 'init', { nx: 2, ny: 1 });
    for (const edge of EDGES_2X1_LAST_TWO_BOXES) {
      lastResult = await rpc(cli, 'applyMove', { edge });
    }
    if (!lastResult.closedBoxes || lastResult.closedBoxes.length !== 2) {
      throw new Error(`2x1: expected closedBoxes.length === 2, got ${lastResult.closedBoxes?.length}`);
    }
    if (lastResult.extraTurn !== true) {
      throw new Error(`2x1: expected extraTurn === true, got ${lastResult.extraTurn}`);
    }

    // --- Scenario 3: botMove determinism (same first move from empty 2x2) ---
    await rpc(cli, 'init', { nx: 2, ny: 2 });
    const bot1 = await rpc(cli, 'botMove', {});
    await rpc(cli, 'init', { nx: 2, ny: 2 });
    const bot2 = await rpc(cli, 'botMove', {});
    const e1 = bot1.move;
    const e2 = bot2.move;
    if (e1.a.x !== e2.a.x || e1.a.y !== e2.a.y || e1.b.x !== e2.b.x || e1.b.y !== e2.b.y) {
      throw new Error(`botMove determinism: first move ${JSON.stringify(e1)} !== second ${JSON.stringify(e2)}`);
    }

    // --- Scenario 4: illegal move (duplicate edge) → JSON-RPC error ---
    await rpc(cli, 'init', { nx: 2, ny: 2 });
    const edge = { a: { x: 0, y: 0 }, b: { x: 1, y: 0 } };
    await rpc(cli, 'applyMove', { edge });
    try {
      await rpc(cli, 'applyMove', { edge });
      throw new Error('illegal move: expected RPC error, got success');
    } catch (e) {
      if (!e.message.includes('error') && !e.message.includes('code')) {
        throw new Error(`illegal move: expected error message, got: ${e.message}`);
      }
    }

    console.log('Integration test passed.');
  } finally {
    cli.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
