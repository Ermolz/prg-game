# Запуск UI (Windows)

Цей файл описує запуск Electron UI на Windows (PowerShell або cmd) та типові причини помилок “Engine stopped / Not initialized”.

## 1) Передумови

Потрібно мати хоча б один працюючий рушій (краще — C# за замовчуванням).

### C# (рекомендовано, default)

- Встановити **.NET SDK**.\n
- З кореня репо (`game/`) зібрати CLI:

```powershell
dotnet build src\csharp\DotsAndBoxes.Cli
```

### Java (опційно)

- Встановити **JDK 17**.\n
- З кореня репо:

```powershell
cd src\java
.\gradlew.bat shadowJar
```

### Python (опційно)

- Переконатися, що `python` доступний у PATH.\n
- CLI лежить у `src/python/cli.py` і пакет логіки — у `src/python/dab/`.

### Prolog (опційно)

- Встановити **SWI-Prolog** і переконатися, що `swipl` доступний у PATH.\n
- CLI лежить у `src/prolog/cli.pl`.

## 2) Запуск UI (dev)

З кореня репо:

```powershell
cd ui-electron
npm install
npm run dev
```

Перед запуском `dev` виконується `npm run check:cli` (див. `ui-electron/scripts/check-cli.cjs`), який перевіряє доступність рушіїв і тестує `init`.

## 3) Типові проблеми

### “Engine stopped”

Означає, що процес рушія завершився або IPC запит не зміг бути виконаний.\n
Часті причини:
- не встановлений потрібний runtime/CLI (наприклад, немає `python` в PATH);\n
- Java JAR не зібраний;\n
- рушій впав на старті (дивись stderr у LogPanel або у консолі).

### “Not initialized”

Означає, що для рушія не викликали `init` перед `applyMove/botMove`.\n
UI зазвичай відновлюється через `Restart engines` (див. `Settings`) + `replay`.

