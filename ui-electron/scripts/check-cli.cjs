/**
 * Check that dotnet is available, DotsAndBoxes.Cli builds, and CLI starts and responds to init.
 * Run from ui-electron (cwd = ui-electron). Exit 1 with message if check fails.
 */
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const repoRoot = process.env.DAB_REPO_ROOT
  ? path.resolve(process.env.DAB_REPO_ROOT)
  : path.join(__dirname, '..', '..');
const cliProject = path.join(repoRoot, 'src', 'csharp', 'DotsAndBoxes.Cli');
const csharpRoot = path.resolve(repoRoot, 'src', 'csharp');

const isWin = process.platform === 'win32';
const runGuide = isWin ? 'RUN-WINDOWS.md' : 'RUN-LINUX.md';

const msg = `
CLI перевірка не пройдена.

1. Встановіть .NET SDK (dotnet) і додайте до PATH.
2. З кореня репо (game) виконайте:
   dotnet build src/csharp/DotsAndBoxes.Cli
3. Потім з каталогу game:
   cd ui-electron && npm install && npm run dev

Детальні інструкції: ${runGuide}
Або задайте DAB_REPO_ROOT (абсолютний шлях до каталогу game) і переконайтеся, що CLI зібрано.
`;

try {
  execSync('dotnet --version', { stdio: 'ignore' });
} catch {
  console.error('Помилка: dotnet не знайдено в PATH.');
  console.error(msg);
  process.exit(1);
}

if (!fs.existsSync(path.join(cliProject, 'DotsAndBoxes.Cli.csproj'))) {
  console.error('Помилка: проєкт CLI не знайдено за шляхом:', cliProject);
  console.error(msg);
  process.exit(1);
}

try {
  execSync('dotnet build DotsAndBoxes.Cli/DotsAndBoxes.Cli.csproj --verbosity quiet', {
    cwd: csharpRoot,
    stdio: 'inherit',
  });
} catch {
  console.error('Помилка: збірка CLI не вдалася.');
  console.error(msg);
  process.exit(1);
}

// Startup check: spawn CLI, send init with Content-Length, expect result within 5s
const HEADER_END = Buffer.from('\r\n\r\n', 'ascii');
function writeStdin(stdin, data, encoding) {
  return new Promise((resolve, reject) => {
    stdin.write(data, encoding, (err) => (err ? reject(err) : resolve()));
  });
}
async function sendContentLength(stdin, body) {
  const bodyBuf = Buffer.from(body, 'utf8');
  const header = `Content-Length: ${bodyBuf.length}\r\n\r\n`;
  await writeStdin(stdin, header, 'ascii');
  await writeStdin(stdin, bodyBuf);
}

function readNextFrame(stdout) {
  return new Promise((resolve, reject) => {
    let buf = Buffer.alloc(0);
    const timeout = setTimeout(() => {
      stdout.removeListener('data', onData);
      reject(new Error('CLI startup timeout (5s)'));
    }, 5000);
    const onData = (chunk) => {
      buf = Buffer.concat([buf, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
      const idx = buf.indexOf(HEADER_END);
      if (idx < 0) return;
      const header = buf.subarray(0, idx).toString('ascii');
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        clearTimeout(timeout);
        stdout.removeListener('data', onData);
        reject(new Error('Invalid CLI response header'));
        return;
      }
      const len = parseInt(match[1], 10);
      const bodyStart = idx + HEADER_END.length;
      if (buf.length < bodyStart + len) return;
      const body = buf.subarray(bodyStart, bodyStart + len).toString('utf8');
      clearTimeout(timeout);
      stdout.removeListener('data', onData);
      resolve(body);
    };
    stdout.on('data', onData);
  });
}

const debug = process.env.DAB_CHECK_DEBUG === '1' || process.env.DAB_CHECK_DEBUG === 'true';

function logDebug(...args) {
  if (debug) console.error('[check-cli]', ...args);
}

(async () => {
  const stderrChunks = [];
  try {
    logDebug('repoRoot:', repoRoot);
    logDebug('csharpRoot:', csharpRoot);
    logDebug('cliProject:', cliProject);

    const cli = spawn('dotnet', ['run', '--project', path.resolve(cliProject), '--no-build'], {
      cwd: csharpRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    cli.stderr.on('data', (chunk) => stderrChunks.push(chunk));
    cli.on('error', (err) => {
      console.error('[check-cli] spawn error:', err.message);
    });

    logDebug('spawned dotnet, sending init...');
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'init', params: { nx: 2, ny: 2 } });
    await sendContentLength(cli.stdin, body);
    logDebug('init sent, waiting for response...');
    const raw = await readNextFrame(cli.stdout);
    cli.kill();

    const msg2 = JSON.parse(raw);
    if (msg2.error || !msg2.result) {
      console.error('Помилка: CLI не повернув успішний result для init.');
      console.error(msg);
      process.exit(1);
    }
  } catch (e) {
    console.error('Помилка: CLI не запустився або не відповів на init:', e.message);
    if (stderrChunks.length > 0) {
      const stderrText = Buffer.concat(stderrChunks).toString('utf8').trim();
      console.error('\nCLI stderr:\n' + stderrText);
    }
    if (debug) {
      console.error('Paths: repoRoot=', repoRoot, 'csharpRoot=', csharpRoot, 'cliProject=', cliProject);
    } else {
      console.error('\nPaths: DAB_REPO_ROOT=' + (process.env.DAB_REPO_ROOT || '(auto)') + ' → repoRoot=' + repoRoot);
    }
    console.error(msg);
    process.exit(1);
  }
})();
