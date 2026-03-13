# Чеклист перед здачею (Prolog + CLI + звіт)

## Критично: `src/prolog/cli.pl`

Актуальна версія у репозиторії містить `choose_bot_move/5`, `meta` (`depthRequested`, `depthUsed`, …), розширений `write_exception/3`, `:- discontiguous handle/3.`, `library(json)`. Якщо локальна копія коротка — відновіть з git або **Local History** у Cursor. Очікувані елементи:

- `:- use_module(library(json)).` (не застарілий `http/json`);
- `choose_bot_move/5` у `use_module(yermolovych_dab_main, ...)`;
- `handle(botMove, ...)` з `bot_move_params`, `meta`, `bot_meta_to_json/2`;
- `write_exception/3` з гілками `existence_error(option, ...)`, `domain_error(...)`, `existence_error(variable, dab_state)`;
- `:- discontiguous handle/3.` якщо допоміжні предикати між клаузами `handle/3`.

Після відновлення:

```bash
cd ui-electron
node scripts/integration-cli-prolog.test.mjs
```

Очікування: `Prolog CLI integration test passed.` без критичних попереджень у stderr (допустиме попередження про `library(json)` у старих інструкціях — перевірте версію SWI).

## Перевірка warning / singleton

З кореня репозиторію:

```bash
swipl -q -g "set_prolog_flag(verbose,silent), load_files(['src/prolog/yermolovych_dab_main'], [module(user)]), halt." 2>&1
```

Або завантажити всі модулі з `src/prolog/` і переконатися, що **немає** `Singleton variable` / `Clauses of handle/3 are not together` (для останнього — `discontiguous` або згрупувати клаузи).

```bash
swipl -q -g run_tests -t halt -s tests/prolog/test_dab.pl 2>&1
```

Усі тести мають пройти **без** попереджень PlUnit про singleton (використовуйте `_` або імена для змінних навмисно). Завантаження тестів через `file_search_path(project_prolog, …)` має давати **чистий** вивід без deprecated-попередження SWI про `source_search_working_directory`.

**Ручна демонстрація для захисту:** [DEMO_MANUAL.md](DEMO_MANUAL.md) або `node scripts/demo-minimax-meta.mjs` з `ui-electron/` — у відповіді `botMove` видно `meta.depthRequested`, `depthUsed`, `nodes`, `cutoffs`.

## Коментарі до предикатів (вимоги «Задача» / «Гра»)

Переконайтеся, що для кожного з перелічених є: режими параметрів (`++`/`--`), короткий опис призначення, 1–2 речення про мультипризначенність / приклади:

- `choose_bot_move/5`, `parse_minimax_options/3` — `yermolovych_dab_bot.pl`
- `move_metrics/4`, `third_side_risk/3` — `yermolovych_dab_metrics.pl`
- `minimax_decide/7`, `minimax_value/7`, `ordered_moves/2`, `static_eval/3`, `terminal_value/3` — `yermolovych_dab_search.pl`
- нові гілки `write_exception/3`, `handle(botMove,...)`, `bot_move_params/3` — `cli.pl`

## Джерела, ІІ, висновки

- Розділ **«Власний внесок і переробка матеріалів»** — у [REFERENCES.md](REFERENCES.md).
- Розширені **висновки, ІІ, альтернативи, порівняння з імперативними мовами, трудомісткість** — у [REPORT.md](REPORT.md).
- **Обґрунтування без CLP** — у [REPORT.md](REPORT.md) (розділ Prolog) та на слайдах.

## Слайди

У [SLIDES_OUTLINE.md](SLIDES_OUTLINE.md): окремі слайди про **greedy_safe**, **MiniMax**, **Alpha-Beta**, глибину в півходах, **extra turn**, таблицю **1464/0** та **286/25** (позиція A) — узгоджено з [REPORT.md](REPORT.md).

**Узгодження чисел:** еталон позиції A — повний MiniMax **1464** вузлів, **0** відсічень; MiniMax + α–β — **286** вузлів, **25** відсічень (**1464/0** та **286/25**). Еталон демо — [DEMO_MANUAL.md](DEMO_MANUAL.md).

## Фінальна перевірка запуску (перед відправкою)

| Крок | Команда / дія | Очікування |
|------|----------------|------------|
| PlUnit | `swipl -q -g run_tests -t halt -s tests/prolog/test_dab.pl` | **21/21** passed |
| Інтеграція CLI | `cd ui-electron` → `node scripts/integration-cli-prolog.test.mjs` | `Prolog CLI integration test passed.` |
| Завантаження без singleton | `swipl -q -g "set_prolog_flag(verbose,warning), load_files(['src/prolog/yermolovych_dab_main'],[silent(true)]), halt."` | без попереджень у stderr |
| Ручний `botMove` + `meta` | [DEMO_MANUAL.md](DEMO_MANUAL.md) або `demo-minimax-meta.mjs` | `nodes=286`, `cutoffs=25`, `depthRequested=3`, `depthUsed=3` |

*(Останній успішний прогін у середовищі розробки: PlUnit 21/21, інтеграційний тест — OK.)*

## Пакет здачі

Чеклист: посилання на репо, архів коду, pptx, замітки, ДистЕДУ — [SUBMISSION_PACKAGE.md](SUBMISSION_PACKAGE.md); тези для захисту — [SPEAKER_NOTES.md](SPEAKER_NOTES.md).
