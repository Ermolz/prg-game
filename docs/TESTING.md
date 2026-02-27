# Тестування

Усі команди виконуються з кореня репо (game/) у **WSL** (bash).

## Prolog (PlUnit)

```bash
swipl -q -g run_tests -t halt -s tests/prolog/test_dab.pl
```

Або через Makefile: `make prolog-tests`.

Покриті сценарії: total_edges 2x2=12, possible_moves на порожній 2x2=12, повтор ребра нелегальний, закриття 1 box на 1x1 (extra turn), закриття 2 box одним ребром (2x1), extra turn не змінює гравця, no-close змінює гравця, game_over при заповнених ребрах, детермінованість бота, бот обирає безпечний хід при наявності.

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
```

Сценарії: init (формат state), possibleMoves (2×2 → 12 ребер), applyMove для 1×1 (закриття клітинки, extraTurn), botMove (move + state + reason), gameOver, повторний хід по тому ж ребру → очікується RPC error. Деталі протоколу — [tech/protocol.md](tech/protocol.md).
