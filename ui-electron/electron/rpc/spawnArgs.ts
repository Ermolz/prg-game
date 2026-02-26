import * as path from 'path';
import type { EngineKind } from './types';

const UI_ELECTRON_ROOT = path.join(__dirname, '..', '..');
const REPO_ROOT = process.env.DAB_REPO_ROOT
  ? path.resolve(process.env.DAB_REPO_ROOT)
  : path.join(UI_ELECTRON_ROOT, '..');
const CLI_PROJECT = path.join(REPO_ROOT, 'src', 'csharp', 'DotsAndBoxes.Cli');
const CSHARP_ROOT = path.resolve(REPO_ROOT, 'src', 'csharp');
const JAVA_ROOT = path.resolve(REPO_ROOT, 'src', 'java');
const PYTHON_ROOT = path.resolve(REPO_ROOT, 'src', 'python');
const PROLOG_ROOT = path.resolve(REPO_ROOT, 'src', 'prolog');

export function getSpawnArgs(kind: EngineKind): { command: string; args: string[]; cwd: string } {
  const isWin = process.platform === 'win32';
  const { app } = require('electron');

  if (kind === 'csharp') {
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

  if (kind === 'java') {
    if (app.isPackaged && process.resourcesPath) {
      const cliDir = path.join(process.resourcesPath, 'cli');
      const command = 'java';
      const args = ['-jar', path.join(cliDir, 'dab-cli.jar')];
      return { command, args, cwd: cliDir };
    }
    const gradlew = isWin ? 'gradlew.bat' : './gradlew';
    const command = path.join(JAVA_ROOT, gradlew);
    return {
      command,
      args: ['run', '--quiet'],
      cwd: JAVA_ROOT,
    };
  }

  if (kind === 'python') {
    if (app.isPackaged && process.resourcesPath) {
      const cliDir = path.join(process.resourcesPath, 'cli');
      const command = 'python';
      const args = [path.join(cliDir, 'cli.py')];
      return { command, args, cwd: cliDir };
    }
    const command = 'python';
    const args = [path.join(PYTHON_ROOT, 'cli.py')];
    return { command, args, cwd: PYTHON_ROOT };
  }

  if (kind === 'prolog') {
    if (app.isPackaged && process.resourcesPath) {
      const cliDir = path.join(process.resourcesPath, 'cli');
      const command = 'swipl';
      const args = ['-g', 'main', '-t', 'halt', '-s', path.join(cliDir, 'cli.pl')];
      return { command, args, cwd: cliDir };
    }
    const command = 'swipl';
    const args = ['-g', 'main', '-t', 'halt', '-s', path.join(PROLOG_ROOT, 'cli.pl')];
    return { command, args, cwd: PROLOG_ROOT };
  }

  throw new Error(`Engine "${kind}" is not implemented`);
}
