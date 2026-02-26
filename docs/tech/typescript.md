# TypeScript та JavaScript

Використовуються для десктопного застосунку (Electron), веб-інтерфейсу (React), збірки та допоміжних скриптів.

---

## TypeScript

**Навіщо:** статична типізація, менше помилок під час розробки, краща підтримка в IDE.

**Де використовується:**
- [ui-electron/electron/](ui-electron/electron/) — процес Electron (main, preload, RPC)
- [ui-electron/renderer/src/](ui-electron/renderer/src/) — React-додаток (компоненти, хуки, модель)
- Конфіги: [tsconfig.json](ui-electron/tsconfig.json), [tsconfig.electron.json](ui-electron/tsconfig.electron.json)

---

## Electron

**Навіщо:** десктопний застосунок на веб-технологіях (Chromium + Node.js), один код для Windows/macOS/Linux.

**Де використовується:**
- [ui-electron/electron/main.ts](ui-electron/electron/main.ts) — головний процес, вікно, IPC
- [ui-electron/electron/preload.ts](ui-electron/electron/preload.ts) — мост між renderer і main (безпечний API для вікна)
- Запуск CLI-рушіїв (C#, Java, Python, Prolog) через [spawnArgs.ts](ui-electron/electron/rpc/spawnArgs.ts), [EngineInstance.ts](ui-electron/electron/rpc/EngineInstance.ts), [orchestrator.ts](ui-electron/electron/rpc/orchestrator.ts)

---

## React

**Навіщо:** компонентний UI, реактивний стан, велика екосистема.

**Де використовується:**
- [ui-electron/renderer/src/App.tsx](ui-electron/renderer/src/App.tsx) — кореневий компонент
- [ui-electron/renderer/src/components/](ui-electron/renderer/src/components/) — Header, GameBoard, ControlsCard, Banners, SettingsModal, LogPanel тощо
- [ui-electron/renderer/src/hooks/useGameState.ts](ui-electron/renderer/src/hooks/useGameState.ts), [useSettings.ts](ui-electron/renderer/src/hooks/useSettings.ts) — стан гри та налаштувань

---

## Vite

**Навіщо:** швидка збірка та hot reload для фронтенду, підтримка React і TypeScript.

**Де використовується:**
- [ui-electron/vite.config.ts](ui-electron/vite.config.ts) — конфігурація збірки
- Скрипти в [package.json](ui-electron/package.json): `dev:vite`, `build:vite`

---

## Tailwind CSS

**Навіщо:** утилітарні класи для верстки без окремих CSS-файлів для кожного компонента.

**Де використовується:**
- [ui-electron/renderer/src/styles.css](ui-electron/renderer/src/styles.css) — підключення Tailwind
- [ui-electron/tailwind.config.js](ui-electron/tailwind.config.js), [postcss.config.js](ui-electron/postcss.config.js)
- Класи в компонентах (наприклад [Header.tsx](ui-electron/renderer/src/components/Header.tsx), [GameBoard.tsx](ui-electron/renderer/src/components/GameBoard.tsx))

---

## Node.js (JavaScript) — скрипти

**Навіщо:** автоматизація: перевірка CLI, публікація рушіїв, інтеграційні тести.

**Де використовується:**
- [ui-electron/scripts/publish-cli.cjs](ui-electron/scripts/publish-cli.cjs) — копіювання C#/Java/Python/Prolog CLI у `resources/cli`
- [ui-electron/scripts/check-cli.cjs](ui-electron/scripts/check-cli.cjs) — перевірка наявності CLI перед запуском
- [ui-electron/scripts/integration-cli-java.test.mjs](ui-electron/scripts/integration-cli-java.test.mjs), [integration-cli-python.test.mjs](ui-electron/scripts/integration-cli-python.test.mjs), [integration-cli-prolog.test.mjs](ui-electron/scripts/integration-cli-prolog.test.mjs) — тести JSON-RPC контракту

---

## electron-builder

**Навіщо:** збірка установлюваного пакету (exe, dmg, AppImage) та копіювання ресурсів (CLI) у пакет.

**Де використовується:**
- Секція `build` у [ui-electron/package.json](ui-electron/package.json) (appId, extraResources, output)
- Команда `dist` у [package.json](ui-electron/package.json)
