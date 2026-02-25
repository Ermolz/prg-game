# Запуск UI на Linux (bash / WSL)

## Вимоги

- Node.js (npm)
- .NET SDK (dotnet) у PATH
- Репозиторій з клонованим проєктом (каталог `game` — корінь репо)

## Кроки з кореня репо

Усі команди виконуйте з каталогу **game** (корінь репозиторія).

1. **Зібрати CLI**
   ```bash
   dotnet build src/csharp/DotsAndBoxes.Cli
   ```

2. **Встановити залежності UI та запустити в режимі розробки**
   ```bash
   cd ui-electron && npm install && npm run dev
   ```

   Перед `npm run dev` скрипт `check:cli` перевірить наявність `dotnet`, збірку CLI та тестовий запуск (init). Якщо щось не так — виведеться інструкція.

## Якщо запускаєте не з кореня репо

Задайте абсолютний шлях до каталогу `game`:

```bash
export DAB_REPO_ROOT=/абсолютний/шлях/до/game
cd ui-electron && npm run dev
```

У WSL шлях може бути, наприклад, `/mnt/e/.../game`.

## Prod-збірка та запуск

```bash
dotnet build src/csharp/DotsAndBoxes.Cli
cd ui-electron && npm run build && npm start
```

## Інтеграційний тест

```bash
dotnet build src/csharp/DotsAndBoxes.Cli && cd ui-electron && npm run test:integration
```
