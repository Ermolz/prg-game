# Тестування

Усі команди виконуються з кореня репо (game/) у **WSL** (bash).

## Огляд

У проєкті є три типи перевірок:

- **Unit/logic тести рушіїв** (Prolog/Python/Java/C#): перевіряють логіку гри та бота без UI.
- **Contract/integration тести CLI** (з боку `ui-electron/scripts/`): перевіряють JSON-RPC контракт (Content-Length framing) для кількох рушіїв.
- **Ручна перевірка UI** (Electron): smoke-перевірка UX і стабільності (див. чеклист нижче).

## Prolog (PlUnit)

```bash
swipl -q -g run_tests -t halt -s tests/prolog/test_dab.pl
```

Або через Makefile: `make prolog-tests`.

Тести самі виставляють `file_search_path(project_prolog, …)` від каталогу `tests/prolog`, тому модулі з `src/prolog` підвантажуються без відносних шляхів і **без** попередження SWI про deprecated `source_search_working_directory`.

**Ручна демонстрація minimax + `meta`:** див. [DEMO_MANUAL.md](DEMO_MANUAL.md) або `node ui-electron/scripts/demo-minimax-meta.mjs` (з каталогу `ui-electron`). Еталон позиції A (порожня 2×2, глибина 3): повний MiniMax **1464** вузлів / **0** відсічень; з α–β — **286** / **25** (як у [REPORT.md](REPORT.md) і на слайді).

Покриті сценарії: total_edges 2x2=12, possible_moves на порожній 2x2=12, повтор ребра нелегальний, закриття 1 box на 1x1 (extra turn), закриття 2 box одним ребром (2x1), extra turn не змінює гравця, no-close змінює гравця, game_over при заповнених ребрах, детермінованість бота, бот обирає безпечний хід при наявності.

**Prolog (розширення):** `choose_bot_move/5` узгоджений з `bot_move_greedy_safe/3`; помилки `domain_error` / `existence_error` для опцій minimax; дублікати `depth`/`alpha_beta` у списку опцій (остання перемагає); еквівалентність глибини 1 півхід з референсом на `static_eval`; збіг ходу MiniMax з повним перебором і з α–β (1×1 smoke + нетривіальна часткова 2×2 з перевіркою nodes/cutoffs); контракт `Meta` (`depthRequested` / `depthUsed`); інтеграційний тест Prolog CLI перевіряє поля `meta` у відповіді `botMove` з `{}`.

## Python (pytest)

```bash
PYTHONPATH=src/python pytest tests/python -q
```

Або: `make python-tests`.

Тести імпортують з пакета `dab` (state, core, bot). Сценарії узгоджені з Prolog.

## Java (JUnit 5, Gradle)

```bash
cd src/java && ./gradlew test
```

Або: `make java-tests`.

Мінімум 8 тестів: totalEdges, possibleMoves, повтор ребра, close 1 box + extra turn, close 2 boxes, extra turn зберігає гравця, no-close змінює гравця, бот детермінований.

## C# (xUnit)

```bash
cd src/csharp && dotnet test
```

Або: `make csharp-tests`.

Аналогічні сценарії до Java.

## Інтеграційні тести CLI (Electron)

Перевірка JSON-RPC контракту: UI відправляє запити до зібраного CLI і перевіряє відповіді. Команди виконуються з каталогу **ui-electron/** (перед цим `npm install`).

```bash
cd ui-electron
npm run test:integration:java    # потрібен зібраний dab-cli.jar (src/java)
npm run test:integration:python  # потрібен Python і src/python
npm run test:integration:prolog  # потрібен SWI-Prolog (swipl) і src/prolog
npm run test:integration         # C# CLI (dotnet run) — базовий контрактний тест
```

Сценарії: init (формат state), possibleMoves (2×2 → 12 ребер), applyMove для 1×1 (закриття клітинки, extraTurn), botMove (move + state + reason), gameOver, повторний хід по тому ж ребру → очікується RPC error. Деталі протоколу — [tech/protocol.md](tech/protocol.md).

## Ручна перевірка UI (smoke checklist)

Ціль: переконатися, що UI та рушії працюють як система.

- Запуск: `cd ui-electron && npm run dev`.
- Відкрити налаштування (Settings): змінити `gameEngine` і `botEngine`, застосувати.
- New game: запустити гру 2×2 і 3×2.
- Клік по ребру: допустимі ребра клікаються; повтор ребра не проходить.
- Bot move (у PvE): бот робить хід; якщо рушій падає — статус переходить в `down`, а UI може відновитися через restart.
- Undo/Redo: `Ctrl+Z` та `Ctrl+Y` відновлюють стан через replay.
- Save/Load: зберегти гру у JSON і завантажити — стан відновлюється через replay.
- Логи: увімкнути logsEnabled → з’являється LogPanel; перевірити фільтри, copy/export.

