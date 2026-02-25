/**
 * Publish DotsAndBoxes.Cli as self-contained binary into ui-electron/resources/cli.
 * Run from ui-electron (cwd = ui-electron). Used before electron-builder for packaged app.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const repoRoot = process.env.DAB_REPO_ROOT
  ? path.resolve(process.env.DAB_REPO_ROOT)
  : path.join(__dirname, '..', '..');
const cliProject = path.join(repoRoot, 'src', 'csharp', 'DotsAndBoxes.Cli');
const outDir = path.join(__dirname, '..', 'resources', 'cli');

const platform = process.platform;
const rid = platform === 'win32' ? 'win-x64' : platform === 'darwin' ? 'osx-x64' : 'linux-x64';

if (!fs.existsSync(path.join(cliProject, 'DotsAndBoxes.Cli.csproj'))) {
  console.error('CLI project not found at', cliProject);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

console.log('Publishing CLI to', outDir, 'for', rid);
execSync(
  `dotnet publish "${cliProject}" -c Release -r ${rid} --self-contained -o "${outDir}"`,
  { stdio: 'inherit', shell: true }
);
