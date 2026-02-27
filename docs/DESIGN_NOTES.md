# Design Notes

## Структури даних

- **Prolog:** ребра зберігаються як **ordset** (library(ordsets)); усі ребра нормалізовані через `normalize_edge/2` (канонічний порядок точок за терм-порівнянням). Це забезпечує детермінованість та швидкий перевірки членства.

- **Python:** пакет `dab`: стан як frozen dataclass, ребра як `frozenset`. Розділення: `types` (Point, Edge, Box, Reason), `state` (State, initial_state), `geometry` (box_edges, adjacent_boxes_for_edge, completed_boxes_by_edge), `core` (правила гри), `bot` (стратегія). Логіка «0..2 сусідніх box» винесена в geometry, щоб не змішувати з apply_move.

- **Java:** record + `HashSet<Edge>`. Збірка — **Gradle Groovy** замість Maven. Незмінюваність: при застосуванні ходу створюється новий `HashSet<>(edges)`.

- **C#:** `readonly record struct` для Point/Edge, `sealed record` State з `HashSet<Edge>`. При застосуванні ходу — копія HashSet.

## Чому без CLP(FD)

Сітка мала (NX, NY — невеликі числа); арифметика через `is`, `=:=`, `=<` достатня. CLP(FD) додав би складність без виграшу для поточної задачі.

## Одна логіка — три імперативні порти

Python є еталоном; Java та C# повторюють ту саму модель (point, edge, box, state) та політику бота (greedy_close → safe_no_third_side → fallback_min_risk) з тими самими tie-break правилами.
