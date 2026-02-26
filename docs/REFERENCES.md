# Джерела

## Внутрішні документи проєкту

- **[docs/tech/](tech/README.md)** — технології по мовах (TypeScript, C#, Java, Python, Prolog) і [протокол CLI](tech/protocol.md).
- **[docs/DESIGN_NOTES.md](DESIGN_NOTES.md)** — структури даних, чому без CLP(FD), еталонна логіка.
- **[docs/TESTING.md](TESTING.md)** — як запускати тести (Prolog, Python, Java, C#, інтеграційні з UI).

*(Посилання відносні до папки `docs/`.)*

---

## Зовнішні джерела

1. **Dots and Boxes (rules)** — [Wikipedia: Dots and Boxes](https://en.wikipedia.org/wiki/Dots_and_Boxes) — правила гри, представлення поля та ходів.

2. **PSPACE-complete** — статті про складність комбінаторних ігор (опційно згадати для Dots and Boxes).

3. **SWI-Prolog library(ordsets)** — [ordsets](https://www.swi-prolog.org/pldoc/doc_for?object=section(%27A1%27,%27lib/ordsets.pl%27)) — впорядковані множини для зберігання ребер.

4. **SWI-Prolog findall/3** — документація вбудованого предикату для збору розв’язків.

5. **PlUnit** — [PlUnit](https://www.swi-prolog.org/pldoc/doc_for?object=section(%27A1%27,%27packages/plunit.html%27)) — unit-тестування в Prolog.

6. **pytest** — [pytest](https://docs.pytest.org/) — тестування Python.

7. **JUnit 5** — [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/) — тестування Java.

8. **xUnit.net** — [xUnit.net](https://xunit.net/) — тестування .NET.

9. **Java HashSet / Set** — [Java Set](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Set.html) — незмінність та копії множин.

10. **C# record struct** — [Microsoft Learn: record](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record) — immutable value types.
