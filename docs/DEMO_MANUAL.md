# Ручна демонстрація Prolog CLI + minimax + `meta`

Мета: один раз переконатися «наживо», що JSON-RPC відповідь `botMove` містить `meta.depthRequested`, `meta.depthUsed`, `meta.nodes`, `meta.cutoffs` — зручно для захисту.

## Еталонний знімок (збережіть для себе)

Один і той самий сценарій має давати **ті самі числа**, що в таблиці «Позиція A» у [REPORT.md](REPORT.md) (порожня сітка **2×2**, після `init` за замовчуванням):

| Параметр | Значення |
|----------|----------|
| `strategy` | `minimax` |
| `depth` | `3` |
| `alphaBeta` | `true` |
| `meta.depthRequested` | `3` |
| `meta.depthUsed` | `3` |
| `meta.nodes` | **286** |
| `meta.cutoffs` | **25** |

**Пара для запам’ятовування та звіту:** повний MiniMax (α–β вимкнено) на цій позиції — **1464** вузлів і **0** відсічень; MiniMax + α–β — **286** вузлів і **25** відсічень (**1464/0** та **286/25** — ті самі, що в [REPORT.md](REPORT.md) і на слайді).

Перевірка: `node scripts/demo-minimax-meta.mjs` з каталогу `ui-electron/` або варіант B (SWI) нижче — очікувані `nodes` / `cutoffs` саме такі (якщо версія коду збігається з репозиторієм). Якщо цифри розходяться зі звітом — оновіть таблицю в REPORT і слайдах **разом**.

## Варіант A — готовий скрипт (Node)

З каталогу `ui-electron`:

```bash
node scripts/demo-minimax-meta.mjs
```

Очікування: друкується JSON ходу, `reason`, об’єкт `meta` з числовими полями.

## Варіант B — тільки SWI-Prolog (без Node)

З кореня репозиторію (шлях до модуля підставте свій):

```bash
swipl -q
```

У консолі:

```prolog
:- use_module('./src/prolog/yermolovych_dab_main').
:- initial_state(2, 2, S),
   choose_bot_move(S, minimax, [depth(3), alpha_beta(true)], M, Meta),
   writeln(M), writeln(Meta).
```

Перевірте в `Meta` поля `depthRequested`, `depthUsed`, `nodes`, `cutoffs`.

## Варіант C — повний CLI (stdin/stdout)

Запустити:

```bash
swipl -g main -t halt -s src/prolog/cli.pl
```

(робочий каталог — `src/prolog` або вкажіть повний шлях до `cli.pl`).

У інший термінал надіслати один фрейм з `Content-Length` (як у [integration-cli-prolog.test.mjs](../ui-electron/scripts/integration-cli-prolog.test.mjs)): спочатку `init`, потім `botMove` з `params`:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "botMove",
  "params": {
    "strategy": "minimax",
    "depth": 3,
    "alphaBeta": true
  }
}
```

Перед цим обов’язково викликати `init` з `nx`/`ny`.
