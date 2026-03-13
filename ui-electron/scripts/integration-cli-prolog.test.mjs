/**
 * Integration test for Prolog CLI (cli.pl) JSON-RPC contract.
 * Requires SWI-Prolog (swipl) in PATH. Run from ui-electron.
 * Scenarios: init, applyMove, possibleMoves, botMove, gameOver, illegal move error.
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_ELECTRON = path.join(__dirname, '..');
const REPO_ROOT = process.env.DAB_REPO_ROOT
  ? path.resolve(process.env.DAB_REPO_ROOT)
  : path.join(UI_ELECTRON, '..');
const PROLOG_ROOT = path.join(REPO_ROOT, 'src', 'prolog');
const CLI_PL = path.join(PROLOG_ROOT, 'cli.pl');

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

async function main() {
  if (!fs.existsSync(CLI_PL)) {
    console.error('Prolog CLI not found at', CLI_PL);
    process.exit(1);
  }

  const cli = spawn('swipl', ['-g', 'main', '-t', 'halt', '-s', path.join(PROLOG_ROOT, 'cli.pl')], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: PROLOG_ROOT,
  });

  cli.stderr.on('data', (d) => process.stderr.write(d));

  try {
    // --- init and state shape ---
    const initRes = await rpc(cli, 'init', { nx: 2, ny: 2 });
    if (!initRes.state || initRes.state.nx !== 2 || initRes.state.ny !== 2) {
      throw new Error(`init: expected state.nx/ny 2,2, got ${JSON.stringify(initRes.state)}`);
    }
    if (!Array.isArray(initRes.state.edges) || initRes.state.edges.length !== 0) {
      throw new Error(`init: expected state.edges [], got length ${initRes.state.edges?.length}`);
    }

    // --- possibleMoves ---
    const movesRes = await rpc(cli, 'possibleMoves', {});
    if (!movesRes.edges || movesRes.edges.length !== 12) {
      throw new Error(`possibleMoves 2x2: expected 12 edges, got ${movesRes.edges?.length}`);
    }

    // --- 1x1 close box ---
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

    // --- botMove returns move and state ---
    await rpc(cli, 'init', { nx: 2, ny: 2 });
    const botRes = await rpc(cli, 'botMove', {});
    if (!botRes.move || !botRes.move.a || !botRes.move.b) {
      throw new Error(`botMove: expected move { a, b }, got ${JSON.stringify(botRes.move)}`);
    }
    if (!botRes.state) throw new Error('botMove: expected state');
    if (!botRes.reason || typeof botRes.reason !== 'string') {
      throw new Error('botMove: expected reason string');
    }
    if (!botRes.meta || typeof botRes.meta !== 'object') {
      throw new Error('botMove: expected meta object (Prolog unified bot_meta)');
    }
    if (typeof botRes.meta.depthRequested !== 'number' || typeof botRes.meta.depthUsed !== 'number') {
      throw new Error('botMove: expected meta.depthRequested and meta.depthUsed as numbers');
    }
    if (typeof botRes.meta.nodes !== 'number') {
      throw new Error('botMove: expected meta.nodes as number');
    }

    // --- gameOver ---
    const goRes = await rpc(cli, 'gameOver', {});
    if (typeof goRes.gameOver !== 'boolean') {
      throw new Error(`gameOver: expected boolean, got ${typeof goRes.gameOver}`);
    }

    // --- illegal move (duplicate edge) → error ---
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

    console.log('Prolog CLI integration test passed.');
  } finally {
    cli.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
