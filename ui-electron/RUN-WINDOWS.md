# Запуск UI на Windows (PowerShell або cmd)

## Вимоги

- Node.js (npm)
- .NET SDK (dotnet) у PATH
- Репозиторій з клонованим проєктом (каталог `game` — корінь репо). Краще, якщо шлях **без пробілів** (наприклад `E:\dev\game`).

## Кроки з кореня репо

Усі команди виконуйте з каталогу **game** (корінь репозиторія). У PowerShell можна використовувати `;` для кількох команд у одному рядку.

1. **Зібрати CLI**
   ```powershell
   dotnet build src/csharp/DotsAndBoxes.Cli
   ```

2. **Перейти в ui-electron, встановити залежності та запустити dev**
   ```powershell
   cd ui-electron ; npm install ; npm run dev
   ```

   Або окремими командами:
   ```powershell
   cd ui-electron
   npm install
   npm run dev
   ```

   Перед `npm run dev` скрипт `check:cli` перевірить наявність `dotnet`, збірку CLI та тестовий запуск (init). Якщо щось не так — виведеться інструкція.

## Якщо запускаєте не з кореня репо

Задайте абсолютний шлях до каталогу `game` (PowerShell):

```powershell
$env:DAB_REPO_ROOT = "E:\шлях\до\game"
cd ui-electron ; npm run dev
```

У cmd:

```cmd
set DAB_REPO_ROOT=E:\шлях\до\game
cd ui-electron
npm run dev
```

Шлях краще без пробілів; якщо є пробіли — використовуйте лапки: `$env:DAB_REPO_ROOT = "E:\Academy of Mohyla\...\game"`.

## Prod-збірка та запуск

```powershell
dotnet build src/csharp/DotsAndBoxes.Cli
cd ui-electron ; npm run build ; npm start
```

## Інтеграційний тест

```powershell
dotnet build src/csharp/DotsAndBoxes.Cli ; cd ui-electron ; npm run test:integration
```
