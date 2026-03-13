# План слайдів (орієнтовно 12–14 слайдів)

1. **Титул** — Dots and Boxes: Prolog та імперативні реалізації (Python, Java, C#).

2. **Аннотація** — мета проекту: одна логіка гри, декларативна реалізація на Prolog та три імперативні (Python, Java, C#); порівняння за критеріями.

3. **Модель** — point(X,Y), edge(P1,P2), box(X,Y), state(NX, NY, Edges, S1, S2, Player). Сітка NX×NY, ребра та нормалізація.

4. **Інкрементальний підрахунок** — перевірка лише 0..2 box, інцидентних ребру; adjacent_box_for_edge, box_closed.

5. **Prolog-ядро** — схема предикатів: utils, core, metrics, search (MiniMax), bot (`choose_bot_move`, `bot_move_greedy_safe`). Ordsets, без CLP.

6. **Імперативні варіанти** — Python (пакет dab, dataclass, set), Java (record, HashSet, Gradle), C# (record struct, HashSet, xUnit).

7. **Таблиця порівняння** — критерії: модель даних (терми / dataclass / record / record struct), незмінність, testing stack (PlUnit / pytest / JUnit / xUnit), розширюваність.

8. **Стратегія бота (greedy)** — політика greedy_close → safe_no_third_side → fallback_min_risk; tie-break за ребром; **greedy_safe** — евристика без дерева глибини.

9. **Окремий слайд: еволюція пошуку в Prolog** — пункти списком (як у [REPORT.md](REPORT.md), розділ «Еволюція стратегії»):
   - **greedy_safe** — перший рівень;
   - **MiniMax** — додано після greedy;
   - **Alpha-Beta** — зменшення `nodes` при тій самій глибині;
   - **глибина в півходах**; **1 півхід = одне проведене ребро**;
   - **extra turn** — після замикання клітинки хід лишається за тим самим гравцем у стані; важливо для дерева пошуку.

10. **Окремий слайд: таблиця чисел (позиція A)** — порожня 2×2, глибина 3: **MiniMax** — **1464** вузлів, **0** відсічень; **MiniMax + α–β** — **286** вузлів, **25** відсічень (ті самі значення, що в [REPORT.md](REPORT.md): **1464/0** та **286/25**).

11. **Додатково (позиція B)** — за потреби: часткова 2×2, глибина 5 — 18729 vs 449 вузлів; 163 відсічення; той самий хід.

12. **Тестування** — PlUnit, pytest, JUnit5, xUnit; однакові сценарії в усіх реалізаціях; для Prolog додатково контракт пошуку та CLI `meta`.

13. **Висновки та рефлексія** — тези з [REPORT.md](REPORT.md); [SPEAKER_NOTES.md](SPEAKER_NOTES.md).
14. **Джерела** — правила, ordsets, PlUnit, pytest, JUnit, xUnit, теорія MiniMax/α–β; [REFERENCES.md](REFERENCES.md) — comparative material, без копіювання коду, власний внесок.

