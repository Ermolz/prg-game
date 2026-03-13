# Запуск UI (Linux / WSL)

Цей файл описує запуск Electron UI у Linux або у WSL (bash) та базові залежності для рушіїв.

## 1) Передумови

Потрібно мати хоча б один працюючий рушій (краще — C# за замовчуванням).

### C# (рекомендовано, default)

- Встановити **.NET SDK**.\n
- З кореня репо (`game/`) зібрати CLI:

```bash
dotnet build src/csharp/DotsAndBoxes.Cli
```

### Java (опційно)

- Встановити **JDK 17**.\n
- З кореня репо:

```bash
cd src/java
./gradlew shadowJar
```

### Python (опційно)

- Переконатися, що `python3` доступний у PATH.\n
- CLI лежить у `src/python/cli.py` і пакет логіки — у `src/python/dab/`.

### Prolog (опційно)

- Встановити **SWI-Prolog** і переконатися, що `swipl` доступний у PATH.\n
- CLI лежить у `src/prolog/cli.pl`.

## 2) Запуск UI (dev)

З кореня репо:

```bash
cd ui-electron
npm install
npm run dev
```

Перед запуском `dev` виконується `npm run check:cli` (див. `ui-electron/scripts/check-cli.cjs`), який перевіряє доступність рушіїв і тестує `init`.

