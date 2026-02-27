# Dots and Boxes — UI (Electron + TypeScript + React)

Інтерфейс гри на Electron: main/preload/renderer на TypeScript, рушій — C# CLI через stdin/stdout JSON-RPC (Content-Length framing).

## Запуск

- **Linux (bash / WSL):** див. [RUN-LINUX.md](RUN-LINUX.md)
- **Windows (PowerShell / cmd):** див. [RUN-WINDOWS.md](RUN-WINDOWS.md)

Перед `npm run dev` скрипт `check:cli` перевіряє наявність `dotnet`, збірку CLI та тестовий запуск (init); при помилці виводить інструкцію та посилання на відповідний RUN-файл.

## Команди

Усі команди нижче — з кореня репо (`game`), окрім кроків із `cd ui-electron`.

| Крок | Команда |
|------|---------|
| Збірка CLI | `dotnet build src/csharp/DotsAndBoxes.Cli` |
| Встановити залежності UI | `cd ui-electron && npm install` |
| Режим розробки (dev) | `cd ui-electron && npm run dev` |
| Prod-збірка | `cd ui-electron && npm run build` |
| Запуск зібраного (prod) | `cd ui-electron && npm start` |
| Інтеграційний тест контракту CLI | `dotnet build src/csharp/DotsAndBoxes.Cli && cd ui-electron && npm run test:integration` |

**Prod:** З каталогу `game` зібрати CLI, потім `cd ui-electron && npm run build && npm start`. Вікно завантажує зібраний renderer з `dist-renderer/`; CLI запускається через `dotnet run` (той самий шлях, що й у dev).

**Packaged (без dotnet на машині):** `npm run dist` — публікує CLI в `resources/cli/`, збирає UI та пакує electron-builder. У зібраному додатку CLI береться з `resources/cli` (self-contained), dotnet не потрібен.

## Структура

- `electron/` — main.ts, preload.ts, rpc/ (engine spawn CLI, буфер stdout по рядках).
- `renderer/` — Vite + React, сітка SVG, виклики `window.dab`.
- Після збірки: `out-electron/` (main, preload), `dist-renderer/` (статичний фронт).

Документація в репо — українською; коментарі та рядки в коді — англійською.
