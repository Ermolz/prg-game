# План слайдів (8–12 слайдів)

1. **Титул** — Dots and Boxes: Prolog та імперативні реалізації (Python, Java, C#).

2. **Аннотація** — мета проекту: одна логіка гри, декларативна реалізація на Prolog та три імперативні (Python, Java, C#); порівняння за критеріями.

3. **Модель** — point(X,Y), edge(P1,P2), box(X,Y), state(NX, NY, Edges, S1, S2, Player). Сітка NX×NY, ребра та нормалізація.

4. **Інкрементальний підрахунок** — перевірка лише 0..2 box, інцидентних ребру; adjacent_box_for_edge, box_closed.

5. **Prolog-ядро** — схема предикатів: utils, core (initial_state, legal_move, apply_move, possible_moves, game_over), bot (bot_move_greedy_safe). Ordsets, без CLP.

6. **Імперативні варіанти** — Python (пакет dab, dataclass, set), Java (record, HashSet, Gradle), C# (record struct, HashSet, xUnit).

7. **Таблиця порівняння** — критерії: модель даних (терми / dataclass / record / record struct), незмінність, testing stack (PlUnit / pytest / JUnit / xUnit), розширюваність.

8. **Стратегія бота** — політика greedy_close → safe_no_third_side → fallback_min_risk; tie-break за ребром.

9. **Тестування** — PlUnit, pytest, JUnit5, xUnit; однакові сценарії в усіх реалізаціях.

10. **Висновки та рефлексія** — трудоємкість (код, підготовка, звіт), застосування, використання AI.

11. **Джерела** — посилання на правила гри, ordsets, PlUnit, pytest, JUnit, xUnit.
