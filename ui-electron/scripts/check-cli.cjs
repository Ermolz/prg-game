/**
 * Check that at least one CLI is available and responds to init.
 * Verifies all 4 engines (C#, Java, Python, Prolog) and reports which are ready.
 * Run from ui-electron (cwd = ui-electron). Exit 1 only if C# fails (default engine).
 */
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const repoRoot = process.env.DAB_REPO_ROOT
  ? path.resolve(process.env.DAB_REPO_ROOT)
  : path.join(__dirname, '..', '..');
const cliProject = path.join(repoRoot, 'src', 'csharp', 'DotsAndBoxes.Cli');
const csharpRoot = path.resolve(repoRoot, 'src', 'csharp');
const javaRoot = path.resolve(repoRoot, 'src', 'java');
const pythonRoot = path.resolve(repoRoot, 'src', 'python');
const prologRoot = path.resolve(repoRoot, 'src', 'prolog');

const isWin = process.platform === 'win32';
const runGuide = isWin ? 'RUN-WINDOWS.md' : 'RUN-LINUX.md';

const msg = `
CLI перевірка не пройдена.

Щоб хоча б один движок працював:
- C#: встановіть .NET SDK, з game/ виконайте: dotnet build src/csharp/DotsAndBoxes.Cli
- Java: JDK 17, з game/: cd src/java && ./gradlew shadowJar
- Python: python3 у PATH, клон src/python (cli.py, dab/)
- Prolog: swipl у PATH, клон src/prolog (cli.pl, yermolovych_dab_*.pl)

Потім: cd ui-electron && npm install && npm run dev
Детальні інструкції: ${runGuide}
`;

const HEADER_END = Buffer.from('\r\n\r\n', 'ascii');
function writeStdin(stdin, data, encoding) {
  return new Promise((resolve, reject) => {
    stdin.write(data, encoding, (err) => (err ? reject(err) : resolve()));
  });
}
async function sendContentLength(stdin, body) {
  const len = Buffer.byteLength(body, 'utf8');
  const header = `Content-Length: ${len}\r\n\r\n`;
  await writeStdin(stdin, header, 'ascii');
  await writeStdin(stdin, body, 'utf8');
}

function readNextFrame(stdout, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    let buf = Buffer.alloc(0);
    const timeout = setTimeout(() => {
      stdout.removeListener('data', onData);
      reject(new Error('timeout'));
    }, timeoutMs);
    const onData = (chunk) => {
      buf = Buffer.concat([buf, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
      const idx = buf.indexOf(HEADER_END);
      if (idx < 0) return;
      const header = buf.subarray(0, idx).toString('ascii');
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        clearTimeout(timeout);
        stdout.removeListener('data', onData);
        reject(new Error('invalid header'));
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

const initBody = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'init', params: { nx: 2, ny: 2 } });

async function checkEngine(name, spawnFn, timeoutMs = 5000) {
  return new Promise((resolve) => {
    let proc = null;
    const cleanup = () => {
      if (proc) try { proc.kill(); } catch (_) {}
    };
    const fail = (err) => {
      cleanup();
      resolve({ name, ok: false, err: err && err.message });
    };
    (async () => {
      try {
        proc = spawnFn();
        if (!proc || !proc.stdin) return fail(new Error('spawn'));
        proc.stderr.on('data', () => {});
        await sendContentLength(proc.stdin, initBody);
        const raw = await readNextFrame(proc.stdout, timeoutMs);
        cleanup();
        const msg = JSON.parse(raw);
        if (msg.error || !msg.result) return fail(new Error('init failed'));
        resolve({ name, ok: true });
      } catch (e) {
        fail(e);
      }
    })();
  });
}

async function checkCsharp() {
  if (!fs.existsSync(path.join(cliProject, 'DotsAndBoxes.Cli.csproj')))
    return { name: 'csharp', ok: false, err: 'project not found' };
  try {
    execSync('dotnet --version', { stdio: 'ignore' });
  } catch {
    return { name: 'csharp', ok: false, err: 'dotnet not in PATH' };
  }
  try {
    execSync('dotnet build DotsAndBoxes.Cli/DotsAndBoxes.Cli.csproj --verbosity quiet', {
      cwd: csharpRoot,
      stdio: 'pipe',
    });
  } catch {
    return { name: 'csharp', ok: false, err: 'build failed' };
  }
  return checkEngine('csharp', () =>
    spawn('dotnet', ['run', '--project', path.resolve(cliProject), '--no-build'], {
      cwd: csharpRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  );
}

async function checkJava() {
  const jarPath = path.join(javaRoot, 'build', 'libs', 'dab-cli.jar');
  const gradlew = path.join(javaRoot, isWin ? 'gradlew.bat' : 'gradlew');
  if (fs.existsSync(jarPath)) {
    return checkEngine('java', () =>
      spawn('java', ['-jar', jarPath], { cwd: path.dirname(jarPath), stdio: ['pipe', 'pipe', 'pipe'] })
    );
  }
  if (!fs.existsSync(gradlew)) return { name: 'java', ok: false, err: 'no jar, no gradlew' };
  return checkEngine('java', () =>
    spawn(gradlew, ['run', '--quiet'], { cwd: javaRoot, stdio: ['pipe', 'pipe', 'pipe'] })
  );
}

async function checkPython() {
  const cliPy = path.join(pythonRoot, 'cli.py');
  if (!fs.existsSync(cliPy)) return { name: 'python', ok: false, err: 'cli.py not found' };
  const py = isWin ? 'python' : 'python3';
  try {
    execSync(`${py} --version`, { stdio: 'ignore' });
  } catch {
    try {
      execSync('python --version', { stdio: 'ignore' });
    } catch {
      return { name: 'python', ok: false, err: 'python not in PATH' };
    }
  }
  const cmd = process.platform === 'win32' ? 'python' : 'python3';
  return checkEngine('python', () =>
    spawn(cmd, [cliPy], {
      cwd: pythonRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: pythonRoot },
    })
  );
}

async function checkProlog() {
  const cliPl = path.join(prologRoot, 'cli.pl');
  if (!fs.existsSync(cliPl)) return { name: 'prolog', ok: false, err: 'cli.pl not found' };
  try {
    execSync('swipl --version', { stdio: 'ignore' });
  } catch {
    return { name: 'prolog', ok: false, err: 'swipl not in PATH' };
  }
  return checkEngine('prolog', () =>
    spawn('swipl', ['-g', 'main', '-t', 'halt', '-s', cliPl], {
      cwd: prologRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
    }), 15000
  );
}

(async () => {
  const results = await Promise.all([
    checkCsharp(),
    checkJava(),
    checkPython(),
    checkProlog(),
  ]);

  const lines = results.map((r) => (r.ok ? `  ${r.name} ✓` : `  ${r.name} ✗ (${r.err || 'fail'})`));
  console.log('CLI engines:');
  lines.forEach((l) => console.log(l));

  const csharpOk = results.find((r) => r.name === 'csharp').ok;
  const anyOk = results.some((r) => r.ok);

  if (!anyOk) {
    console.error('\nЖоден движок не відповів на init.');
    console.error(msg);
    process.exit(1);
  }
  if (!csharpOk) {
    console.warn('\nC# (движок за замовчуванням) недоступний; UI запуститься з іншим движком, якщо вибрати його в налаштуваннях.');
  }
})();
