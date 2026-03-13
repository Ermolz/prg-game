# UI/Electron: структура, IPC API та поведінка

Цей документ описує фактичну структуру `ui-electron/` і те, як UI взаємодіє з CLI-рушіями.

## 1) Структура `ui-electron/`

- `ui-electron/electron/`
  - `main.ts` — Electron main: створення вікна, IPC handlers, запуск рушіїв, replay, save/load.
  - `preload.ts` — bridge `window.dab` (IPC invoke + event subscription).
  - `rpc/EngineInstance.ts` — запуск підпроцесу рушія + JSON-RPC transport (Content-Length), таймаути, логи, статуси.
  - `rpc/orchestrator.ts` — `botMoveUnified` (replay history на bot-рушії + applyMove на game-рушії).

- `ui-electron/renderer/`
  - `src/hooks/useGameState.ts` — state гри, undo/redo через replay, save/load, recovery при “Engine stopped/Not initialized”.
  - `src/hooks/useSettings.ts` + `src/lib/settingsStorage.ts` — settings у `localStorage`.
  - `src/components/*` — Header/ControlsCard/GameBoard/LogPanel/SettingsModal.

- `ui-electron/scripts/`
  - `check-cli.cjs` — preflight перевірка доступності рушіїв (C#/Java/Python/Prolog) і `init` контракту.
  - `integration-cli*.test.mjs` — contract/integration тести CLI JSON-RPC (Content-Length).

## 2) API, яке бачить renderer: `window.dab`

`window.dab` експонується в `ui-electron/electron/preload.ts` і викликає IPC handlers у `electron/main.ts`.

### 2.1. IPC invoke (команди)

| Renderer API | IPC channel | Реалізація |
|---|---|---|
| `newGame(nx, ny)` | `dab:rpcGame` (`method=init`) | `electron/main.ts` → `EngineInstance.request('init', {nx,ny})` |
| `applyMove(edge)` | `dab:rpcGame` (`method=applyMove`) | `electron/main.ts` → game engine |
| `possibleMoves()` | `dab:rpcGame` (`method=possibleMoves`) | `electron/main.ts` → game engine |
| `gameOver()` | `dab:rpcGame` (`method=gameOver`) | `electron/main.ts` → game engine |
| `botMove()` | `dab:rpcBot` (`method=botMove`) | `electron/main.ts` → bot engine |
| `botMoveUnified({nx,ny,history})` | `dab:botMoveUnified` | `electron/rpc/orchestrator.ts` |
| `replay({nx,ny,history})` | `dab:replay` | `electron/main.ts` (init + applyMove по history) |
| `restartEngines()` | `dab:restartEngines` | `electron/main.ts` (stop + recreate engines) |
| `saveGame(payload)` | `dab:saveGame` | `electron/main.ts` + `dialog.showSaveDialog` |
| `loadGame()` | `dab:loadGame` | `electron/main.ts` + `dialog.showOpenDialog` |
| `setSettings(settings)` | `dab:setSettings` | `electron/main.ts` (оновлює settings + restart) |
| `getSettings()` | `dab:getSettings` | `electron/main.ts` |
| `getGameEngineStatus()` | `dab:getGameEngineStatus` | `electron/main.ts` |
| `getBotEngineStatus()` | `dab:getBotEngineStatus` | `electron/main.ts` |
| `clearLogs()` | `dab:clearLogs` | `electron/main.ts` (no-op; renderer чистить локально) |

> Примітка: у preload є також `getEngineStatus`, `restartEngine`, `setEngine` — вони існують, але основний UI використовує окремі статуси game/bot.

### 2.2. IPC events (підписки)

- `onGameEngineStatus(cb)` слухає `dab:gameEngineStatus`.
- `onBotEngineStatus(cb)` слухає `dab:botEngineStatus`.
- `onLog(cb)` слухає `dab:log`.

Події відправляє main процес (див. `electron/main.ts`).

## 3) Стани рушія і типові збої

### 3.1. Engine status

`EngineInstance` повідомляє один з:
- `starting`
- `ready` (після першої успішної RPC-відповіді)
- `down` (після exit процесу)
- `restarting` (коли UI просить рестарт)

### 3.2. Таймаут і “Engine stopped”

- У `EngineInstance.request()` є таймаут `RPC_TIMEOUT_MS`.
- Якщо таймаут спрацьовує — рушій зупиняється (`stop()`), pending запити отримують помилку.
- Якщо процес рушія завершується — всі pending запити відхиляються з помилкою **`Engine stopped`**.

UI в `useGameState.ts` розпізнає `Engine stopped` / `Not initialized` як “recoverable” і робить:
1) `restartEngines()`
2) `replay({nx,ny,history})`
3) повторює дію (applyMove або botMoveUnified).

## 4) Replay, undo/redo

### 4.1. Replay (джерело правди для UI)

`dab:replay` в main процесі:
- викликає `init` на game-рушії;
- програє `history` через `applyMove`;
- паралельно відновлює `boxOwners` за `closedBoxes` + `extraTurn`.

Renderer використовує `replay` для:
- undo/redo;
- resync після restart;
- load game (save file містить лише history, не snapshot state).

### 4.2. Undo/Redo

`useGameState.ts` тримає:
- `moveHistory: Edge[]`
- `redoStack: Edge[]`

Undo видаляє останній хід з history і робить replay.\n
Redo повертає хід з redoStack назад у history і робить replay.\n
Підтримані hotkeys: `Ctrl+Z` і `Ctrl+Y`.

## 5) Save/Load формат

Збереження робиться в JSON (через Electron dialog у main процесі).

Формат payload (версія 1):
- `version: 1`
- `nx`, `ny`
- `moveHistory: Edge[]`
- `timestamp: ISO string`
- `settings?: Partial<DabSettings>` (snapshot потрібних UI налаштувань)

Load валідуює базову структуру (version, nx/ny, moveHistory array) і потім робить replay.

## 6) Логи

`EngineInstance` генерує записи:
- `dir: 'req' | 'res' | 'stderr'`
- `scope: 'game' | 'bot'`
- `engine: EngineKind`
- `method/id/ms/ok/data` (де доречно)

Main процес пересилає лог у renderer лише коли `settings.logsEnabled === true`.
`LogPanel` у renderer підтримує фільтри (all/game/bot/stderr), clear, copy, export, collapsed view.

