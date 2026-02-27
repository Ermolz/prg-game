# Prolog (SWI-Prolog)

Використовується як один із рушіїв гри: логіка та бот описані предикатами, консольний CLI обгортає їх у JSON-RPC по stdin/stdout.

---

## SWI-Prolog

**Навіщо:** потужний інтерпретатор Prolog з бібліотеками (JSON, ordsets), зручний для логічних правил гри та бота; запуск з командного рядка (`swipl`).

**Де використовується:**
- [src/prolog/cli.pl](src/prolog/cli.pl) — точка входу CLI: цикл stdin/stdout, Content-Length, парсинг JSON, обробники init/applyMove/possibleMoves/botMove/gameOver
- [src/prolog/yermolovych_dab_main.pl](src/prolog/yermolovych_dab_main.pl) — публічний API: initial_state/3, apply_move/5, possible_moves/2, game_over/1, bot_move_greedy_safe/3
- [src/prolog/yermolovych_dab_core.pl](src/prolog/yermolovych_dab_core.pl) — ядро гри (стан, ходи, закриті клітинки)
- [src/prolog/yermolovych_dab_bot.pl](src/prolog/yermolovych_dab_bot.pl) — бот (greedy safe)
- [src/prolog/yermolovych_dab_utils.pl](src/prolog/yermolovych_dab_utils.pl) — утиліти (normalize_edge, point_in_bounds тощо)

---

## library(http/json)

**Навіщо:** перетворення між JSON-рядками та термами Prolog (dict) для протоколу JSON-RPC.

**Де використовується:**
- [src/prolog/cli.pl](src/prolog/cli.pl) — `atom_json_dict(BodyAtom, RequestDict, [])` для читання запиту; `atom_json_dict(JsonAtom, ResponseDict, [as(atom)])` для формування відповіді (result або error)

---

## library(ordsets)

**Навіщо:** зберігання ребер гри як впорядкованої множини (швидкий перевірка належності, уникнення дублікатів).

**Де використовується:**
- [src/prolog/yermolovych_dab_core.pl](src/prolog/yermolovych_dab_core.pl), [yermolovych_dab_bot.pl](src/prolog/yermolovych_dab_bot.pl) — ord_add_element, ord_memberchk тощо для списку ребер у стані

---

## Глобальний стан (nb_setval / nb_getval)

**Навіщо:** збереження поточного стану гри між викликами RPC (Prolog за замовчуванням без мутабельного стану в одному потоці).

**Де використовується:**
- [src/prolog/cli.pl](src/prolog/cli.pl) — після init/applyMove/botMove викликається `nb_setval(dab_state, State)`; перед applyMove/possibleMoves/botMove/gameOver — `nb_getval(dab_state, State)`; при відсутності ключа повертається JSON-RPC error «Not initialized»

---

## Запуск та інтеграція з Electron

**Навіщо:** UI запускає Prolog-CLI як підпроцес і спілкується з ним через той самий JSON-RPC контракт, що й для C#/Java/Python.

**Де використовується:**
- [ui-electron/electron/rpc/spawnArgs.ts](ui-electron/electron/rpc/spawnArgs.ts) — для `kind === 'prolog'`: dev — `swipl -g main -t halt -s cli.pl` з [src/prolog](src/prolog); packaged — те саме з [resources/cli](ui-electron/resources/cli)
- [ui-electron/scripts/publish-cli.cjs](ui-electron/scripts/publish-cli.cjs) — копіювання файлів `.pl` з [src/prolog](src/prolog) у `resources/cli`
- [ui-electron/scripts/integration-cli-prolog.test.mjs](ui-electron/scripts/integration-cli-prolog.test.mjs) — інтеграційний тест JSON-RPC для Prolog CLI
