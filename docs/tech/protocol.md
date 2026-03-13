# Протокол CLI: JSON-RPC поверх stdin/stdout

Усі рушії гри (C#, Java, Python, Prolog) спілкуються з UI одним і тим самим протоколом: **JSON-RPC 2.0** по stdin/stdout з фреймуванням **Content-Length**.

---

## Транспорт

- **Вхід (UI → CLI):** один фрейм на запит:
  - заголовок: `Content-Length: N\r\n\r\n` (N — довжина тіла в байтах UTF-8);
  - тіло: рівно N байт UTF-8 — один JSON-об'єкт запиту.
- **Вихід (CLI → UI):** один фрейм на відповідь:
  - заголовок: `Content-Length: M\r\n\r\n`;
  - тіло: M байт UTF-8 — один JSON-об'єкт відповіді.

Коди реалізації читання/запису фреймів:
- [ui-electron/electron/rpc/EngineInstance.ts](ui-electron/electron/rpc/EngineInstance.ts) (TypeScript)
- [src/csharp/DotsAndBoxes.Cli/Program.cs](src/csharp/DotsAndBoxes.Cli/Program.cs)
- [src/java/src/main/java/dab/Cli.java](src/java/src/main/java/dab/Cli.java)
- [src/python/cli.py](src/python/cli.py)
- [src/prolog/cli.pl](src/prolog/cli.pl)

---

## JSON-RPC 2.0

- **Запит:** `{ "jsonrpc": "2.0", "id": <число або null>, "method": "<назва>", "params": <об'єкт або null> }`.
- **Успішна відповідь:** `{ "jsonrpc": "2.0", "id": <той самий>, "result": <об'єкт> }`.
- **Помилка:** `{ "jsonrpc": "2.0", "id": <той самий>, "error": { "code": <число>, "message": "<рядок>" } }`.

Типові коди помилок: `-32600` (invalid request), `-32602` (invalid params / невалідний хід), `-32603` (internal / не ініціалізовано).

---

## Методи та формат даних

Спільні типи (узгоджені з [ui-electron/renderer/src/model/types.ts](ui-electron/renderer/src/model/types.ts)):

- **Point:** `{ "x": number, "y": number }`
- **Edge:** `{ "a": Point, "b": Point }` (дві сусідні точки сітки)
- **Box:** `{ "x": number, "y": number }` (ліва верхня вершина квадрата 1×1)
- **State:** `{ "nx", "ny", "edges": Edge[], "s1", "s2", "player" }`

| Метод | params | result |
|-------|--------|--------|
| **init** | `{ "nx": number, "ny": number }` | `{ "state": State }` |
| **applyMove** | `{ "edge": Edge }` | `{ "state": State, "closedBoxes": Box[], "extraTurn": boolean }` |
| **possibleMoves** | (пустий або `{}`) | `{ "edges": Edge[] }` |
| **botMove** | див. нижче | `{ "move": Edge, "reason": string, "state": State, "meta": BotMeta }` |
| **gameOver** | (пустий або `{}`) | `{ "gameOver": boolean }` |

**botMove (розширення Prolog-CLI).** Рушії Python/Java/C# залишаються без змін: для них можна передавати `{}` як раніше; поле **`meta`** у відповіді в цих рушіях може бути відсутнім (або додано пізніше). У **Prolog**-CLI (`src/prolog/cli.pl`) відповідь **завжди** містить **`meta`** (єдиний контракт `BotMeta`):

- **`params`** за замовчуванням: `{}` або без ключа `strategy` — стратегія **`greedy_safe`** (як раніше для інтеграційних тестів).
- Опційно: `{ "strategy": "minimax"`, `"depth": <ціле > 0`, `"alphaBeta": true|false }` (або `alpha_beta` замість `alphaBeta`). Для `minimax` обов’язкові `depth` і `alphaBeta`. У Prolog CLI `depth` має бути **цілим** (`integer`), без дробів і без рядків.
- **`meta`:** `{ "strategy": string, "reason": string, "depthRequested": number, "depthUsed": number, "nodes": number, "cutoffs": number }` — для `greedy_safe` завжди `depthRequested: 1`, `depthUsed: 1`, `nodes: 0`, `cutoffs: 0`; для `minimax` — `depthRequested` = запитана глибина (півходи), `depthUsed` = фактична максимальна глибина пошуку за цей виклик (може бути меншою за запитану при ранньому закінченні гри), плюс лічильники `nodes` / `cutoffs`.

**Помилки (Prolog, типові `message`):** `domain error: strategy` / `depth` / `alphaBeta`; `missing option: depth` / `alphaBeta`; `game over` / `no moves` — зазвичай `-32602`. Код **`-32603` + «Not initialized»** — лише якщо не викликано **init** (немає збереженого стану гри); помилкові параметри бота не мають маскуватися під це повідомлення (див. `write_exception/3` у `cli.pl`).

Після **init** CLI зберігає стан у себе; подальші **applyMove** / **botMove** оновлюють цей стан. **possibleMoves** і **gameOver** лише читають поточний стан.

---

## Де використовується

- **UI:** виклики методів через [EngineInstance](ui-electron/electron/rpc/EngineInstance.ts) та [orchestrator](ui-electron/electron/rpc/orchestrator.ts); вибір рушія — [spawnArgs.ts](ui-electron/electron/rpc/spawnArgs.ts).
- **Перевірка контракту:** інтеграційні тести [integration-cli-java.test.mjs](ui-electron/scripts/integration-cli-java.test.mjs), [integration-cli-python.test.mjs](ui-electron/scripts/integration-cli-python.test.mjs), [integration-cli-prolog.test.mjs](ui-electron/scripts/integration-cli-prolog.test.mjs) перевіряють init, possibleMoves, applyMove (в т.ч. 1×1 і duplicate edge), botMove, gameOver та очікувані RPC-помилки.
