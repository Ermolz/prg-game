# Dots and Boxes

Гра «Крапки й квадрати»: кілька реалізацій рушія (Prolog, Python, Java, C#) та один графічний інтерфейс (Electron + React) у каталозі `ui-electron/`.

## Структура репозиторія

| Каталог | Опис |
|---------|------|
| `src/prolog` | Рушій на Prolog |
| `src/python` | Рушій на Python |
| `src/java` | Рушій на Java |
| `src/csharp` | Рушій на C# (Core + CLI для UI) |
| `ui-electron` | Графічний інтерфейс: Electron, TypeScript, Vite, React |
| `tests` | Тести (Prolog, Python тощо) |
| `docs/tech` | Опис технологій по мовах і протокол CLI (JSON-RPC) — [docs/tech/](docs/tech/README.md) |

## Запуск тестів

З кореня репо (`game`):

- **Prolog:** `make prolog-tests` (потрібен SWI-Prolog)
- **Python:** спочатку `python3 -m venv .venv && .venv/bin/pip install pytest`, потім `make python-tests`
- **Java:** один раз у `src/java` виконати `gradle -b wrapper.gradle wrapper --gradle-version 9.3.1`, потім `make java-tests`
- **C#:** `make csharp-tests`
- **Усі:** `make all`

## Запуск UI

Інтерфейс залежить від зібраного C# CLI.

- **Linux:** див. [ui-electron/RUN-LINUX.md](ui-electron/RUN-LINUX.md)
- **Windows:** див. [ui-electron/RUN-WINDOWS.md](ui-electron/RUN-WINDOWS.md)

Коротко з кореня репо: зібрати CLI (`dotnet build src/csharp/DotsAndBoxes.Cli`), потім `cd ui-electron && npm install && npm run dev`. Відкриється вікно з сіткою; клік по ребру та кнопка «Bot move» працюють через CLI.
