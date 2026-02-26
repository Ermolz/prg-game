/**
 * Publish DotsAndBoxes.Cli (C#), dab-cli (Java), and Python CLI into ui-electron/resources/cli.
 * Run from ui-electron (cwd = ui-electron). Used before electron-builder for packaged app.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const repoRoot = process.env.DAB_REPO_ROOT
  ? path.resolve(process.env.DAB_REPO_ROOT)
  : path.join(__dirname, '..', '..');
const cliProject = path.join(repoRoot, 'src', 'csharp', 'DotsAndBoxes.Cli');
const javaProject = path.join(repoRoot, 'src', 'java');
const pythonProject = path.join(repoRoot, 'src', 'python');
const prologProject = path.join(repoRoot, 'src', 'prolog');
const outDir = path.join(__dirname, '..', 'resources', 'cli');

const platform = process.platform;
const rid = platform === 'win32' ? 'win-x64' : platform === 'darwin' ? 'osx-x64' : 'linux-x64';

if (!fs.existsSync(path.join(cliProject, 'DotsAndBoxes.Cli.csproj'))) {
  console.error('CLI project not found at', cliProject);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

console.log('Publishing C# CLI to', outDir, 'for', rid);
execSync(
  `dotnet publish "${cliProject}" -c Release -r ${rid} --self-contained -o "${outDir}"`,
  { stdio: 'inherit', shell: true }
);

if (fs.existsSync(path.join(javaProject, 'build.gradle.kts'))) {
  const jarPath = path.join(javaProject, 'build', 'libs', 'dab-cli.jar');
  try {
    const gradlew = platform === 'win32' ? 'gradlew.bat' : 'gradlew';
    const gradleCmd = path.join(javaProject, gradlew);
    if (!fs.existsSync(gradleCmd)) {
      if (fs.existsSync(jarPath)) {
        fs.copyFileSync(jarPath, path.join(outDir, 'dab-cli.jar'));
        console.log('Copied existing dab-cli.jar to', outDir);
      }
    } else {
      console.log('Building Java dab-cli.jar');
      execSync(`"${gradleCmd}" shadowJar --no-daemon`, {
        cwd: javaProject,
        stdio: 'inherit',
        shell: true,
      });
      if (fs.existsSync(jarPath)) {
        fs.copyFileSync(jarPath, path.join(outDir, 'dab-cli.jar'));
        console.log('Copied dab-cli.jar to', outDir);
      } else {
        console.warn('Java shadowJar did not produce build/libs/dab-cli.jar');
      }
    }
  } catch (err) {
    console.warn('Java CLI build skipped (install JDK 17 and run gradlew shadowJar in src/java to add Java engine to package):', err.message);
    if (fs.existsSync(jarPath)) {
      fs.copyFileSync(jarPath, path.join(outDir, 'dab-cli.jar'));
      console.log('Copied existing dab-cli.jar to', outDir);
    }
  }
}

if (fs.existsSync(path.join(pythonProject, 'cli.py'))) {
  try {
    fs.cpSync(pythonProject, outDir, {
      recursive: true,
      filter: (src) => !src.includes('__pycache__') && !src.endsWith('.pyc'),
    });
    console.log('Copied Python CLI (cli.py, dab/) to', outDir);
  } catch (err) {
    console.warn('Python CLI copy failed:', err.message);
  }
}

if (fs.existsSync(path.join(prologProject, 'cli.pl'))) {
  try {
    fs.cpSync(prologProject, outDir, {
      recursive: true,
      filter: (src) => {
        if (fs.statSync(src).isDirectory()) return true;
        return src.endsWith('.pl');
      },
    });
    console.log('Copied Prolog CLI (cli.pl, yermolovych_dab_*.pl) to', outDir);
  } catch (err) {
    console.warn('Prolog CLI copy failed:', err.message);
  }
}
