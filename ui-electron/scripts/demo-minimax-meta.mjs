/**
 * Ручна демонстрація: Prolog CLI, botMove з strategy=minimax, вивід meta.
 * Запуск: з каталогу ui-electron — node scripts/demo-minimax-meta.mjs
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..');
const PROLOG_ROOT = path.join(REPO_ROOT, 'src', 'prolog');

const HEADER_END = Buffer.from('\r\n\r\n', 'ascii');

function sendContentLength(cli, body) {
  const len = Buffer.byteLength(body, 'utf8');
  cli.stdin.write(`Content-Length: ${len}\r\n\r\n`, 'ascii');
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
      buf = Buffer.concat([buf, chunk]);
      const body = tryParseFrame(buf);
      if (body !== false) {
        done = true;
        cleanup();
        resolve(body);
      }
    }
    function onClose(code) {
      if (done) return;
      const body = tryParseFrame(buf);
      if (body !== false) {
        done = true;
        cleanup();
        resolve(body);
        return;
      }
      cleanup();
      reject(new Error(`CLI closed before full frame. code=${code}`));
    }
    cli.stdout.on('data', onData);
    cli.on('close', onClose);
  });
}

let nextId = 1;
async function rpc(cli, method, params) {
  const id = nextId++;
  sendContentLength(cli, JSON.stringify({ jsonrpc: '2.0', id, method, params }));
  const raw = await readNextFrame(cli);
  const msg = JSON.parse(raw);
  if (msg.id !== id) throw new Error(`id mismatch ${msg.id} !== ${id}`);
  if (msg.error) throw new Error(`RPC error: ${msg.error.message} (code ${msg.error.code})`);
  return msg.result;
}

async function main() {
  const cli = spawn('swipl', ['-g', 'main', '-t', 'halt', '-s', 'cli.pl'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: PROLOG_ROOT,
  });
  cli.stderr.on('data', (d) => process.stderr.write(d));

  try {
    await rpc(cli, 'init', { nx: 2, ny: 2 });
    const res = await rpc(cli, 'botMove', {
      strategy: 'minimax',
      depth: 3,
      alphaBeta: true,
    });
    console.log('--- botMove (minimax, depth=3, alphaBeta=true) ---');
    console.log('move:', JSON.stringify(res.move, null, 2));
    console.log('reason:', res.reason);
    console.log('meta:', JSON.stringify(res.meta, null, 2));
    console.log('\nДля захисту: перевірте depthRequested, depthUsed, nodes, cutoffs у meta.');
  } finally {
    cli.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
