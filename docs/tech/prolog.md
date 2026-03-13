# Prolog (SWI-Prolog)

Використовується як один із рушіїв гри: логіка та бот описані предикатами, консольний CLI обгортає їх у JSON-RPC по stdin/stdout.

---

## SWI-Prolog

**Навіщо:** потужний інтерпретатор Prolog з бібліотеками (JSON, ordsets), зручний для логічних правил гри та бота; запуск з командного рядка (`swipl`).

**Де використовується:**
- [src/prolog/cli.pl](src/prolog/cli.pl) — точка входу CLI: цикл stdin/stdout, Content-Length, парсинг JSON, обробники init/applyMove/possibleMoves/botMove/gameOver
- [src/prolog/yermolovych_dab_main.pl](src/prolog/yermolovych_dab_main.pl) — публічний API: initial_state/3, apply_move/5, possible_moves/2, game_over/1, bot_move_greedy_safe/3, choose_bot_move/5
- [src/prolog/yermolovych_dab_core.pl](src/prolog/yermolovych_dab_core.pl) — ядро гри (стан, ходи, закриті клітинки)
- [src/prolog/yermolovych_dab_bot.pl](src/prolog/yermolovych_dab_bot.pl) — стратегії: `greedy_safe` (евристика) та `minimax` (делегування в пошук)
- [src/prolog/yermolovych_dab_search.pl](src/prolog/yermolovych_dab_search.pl) — MiniMax з опційним Alpha-Beta; **1 півхід = одне проведене ребро**; `static_eval/3` — формула: `Base + Bonus − Penalty` (база = різниця очок з точки зору кореня; бонус за ходи з `Closed ≥ 1`; штраф за суму `Risk` третьої сторони; ваги `eval_weight_*`); `ordered_moves/2` — евристичне впорядкування ходів для більшої кількості відсічень при α–β; **детермінований** tie-break за термом ребра `E` після стабільного `keysort`
- [src/prolog/yermolovych_dab_metrics.pl](src/prolog/yermolovych_dab_metrics.pl) — спільні метрики ходу (закриття / ризик) для greedy та пошуку
- [src/prolog/yermolovych_dab_utils.pl](src/prolog/yermolovych_dab_utils.pl) — утиліти (normalize_edge, point_in_bounds тощо)

---

## Стратегії бота та `Meta`

- **`choose_bot_move(State, Strategy, Options, Move, Meta)`** — єдиний вхідний пункт; `Meta` завжди має вигляд `bot_meta(strategy(S), reason(R), depth_requested(K), depth_used(D), nodes(N), cutoffs(C))`. Для **minimax** опції в списку: `depth(K)` — ціле `K ≥ 1`; `alpha_beta(B)` — `true | false`; обидві обов’язкові. Якщо `depth` або `alpha_beta` зустрічаються кілька разів, **останнє значення в списку перемагає**. Для `greedy_safe` зайві опції ігноруються.
- **Extra turn:** після `apply_move/5` наступний вузол пошуку вже містить правильного гравця (`yermolovych_dab_core`); той самий гравець ходить знову, якщо клітинку закрито — це не «шаблонний» MiniMax без урахування правил, а коректний пошук по грі.

### Приклад позиції (наочно)

На полі **2×2 з порожньою сіткою** перший хід **greedy_safe** і **minimax** (глибина 3 півходи) часто збігаються — обидва уникають зайвої «третьої сторони» і дотримуються детермінованого порядку ребер. На **більш заповнених** позиціях (наприклад, коли залишилися ланцюги «коробок» і довгі ланцюги закриттів) minimax з достатньою глибиною може обрати хід, що відкладає віддачу коротких ланцюгів супернику, тоді як жадібний бот локально максимізує закриття без глобального плану. Конкретні ребра залежать від стану; перевірка: `choose_bot_move(S, greedy_safe, [], M1, _)` порівняно з `choose_bot_move(S, minimax, [depth(3), alpha_beta(true)], M2, _)` у SWI-Prolog.

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
