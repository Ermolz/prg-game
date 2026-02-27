# Python

Використовується як один із рушіїв гри: консольний CLI з JSON-RPC по stdin/stdout та модулі логіки в пакеті `dab`.

---

## Python 3

**Навіщо:** проста мова для швидкої реалізації логіки та CLI, часто вже встановлена на системі, зручно для навчання та прототипів.

**Де використовується:**
- [src/python/cli.py](src/python/cli.py) — точка входу CLI: цикл stdin/stdout, фрейми Content-Length, розбір JSON-RPC (init, applyMove, possibleMoves, botMove, gameOver)
- [src/python/dab/](src/python/dab/) — пакет з логікою: [core.py](src/python/dab/core.py), [geometry.py](src/python/dab/geometry.py), [util.py](src/python/dab/util.py)

---

## Стандартна бібліотека (json, sys)

**Навіщо:** парсинг і серіалізація JSON та робота з stdin/stdout без зовнішніх залежностей.

**Де використовується:**
- [src/python/cli.py](src/python/cli.py) — `json.loads`, `json.dumps` для запитів і відповідей; читання/запис через `sys.stdin` / `sys.stdout`

---

## pytest (опційно, для тестів)

**Навіщо:** запуск тестів логіки гри та контракту в окремому тестовому дереві.

**Де використовується:**
- [tests/python/test_dab.py](tests/python/test_dab.py) — тести для Python-модулів dab (якщо вони є в репозиторії)

---

## Інтеграція з Electron

**Навіщо:** UI запускає Python-CLI як підпроцес і спілкується з ним через JSON-RPC.

**Де використовується:**
- [ui-electron/electron/rpc/spawnArgs.ts](ui-electron/electron/rpc/spawnArgs.ts) — для `kind === 'python'` запуск `python cli.py` з [src/python/](src/python/) (dev) або з [resources/cli](ui-electron/resources/cli) (packaged)
- [ui-electron/scripts/publish-cli.cjs](ui-electron/scripts/publish-cli.cjs) — копіювання вмісту `src/python` у `resources/cli` (без __pycache__)
- [ui-electron/scripts/integration-cli-python.test.mjs](ui-electron/scripts/integration-cli-python.test.mjs) — інтеграційний тест JSON-RPC для Python CLI
