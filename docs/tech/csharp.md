# C#

Використовується як один із рушіїв гри: консольний CLI з JSON-RPC по stdin/stdout та окреме ядро логіки.

---

## C# та .NET

**Навіщо:** швидка розробка, сильна типізація, кроссплатформність (.NET), зручна інтеграція з IDE.

**Де використовується:**
- [src/csharp/DotsAndBoxes.Cli/Program.cs](src/csharp/DotsAndBoxes.Cli/Program.cs) — точка входу CLI: цикл stdin/stdout, фрейми Content-Length, JSON-RPC (init, applyMove, possibleMoves, botMove, gameOver)
- [src/csharp/DotsAndBoxes.Core/](src/csharp/DotsAndBoxes.Core/) — логіка гри (стан, ходи, закриті клітинки)
- [src/csharp/DotsAndBoxes.Tests/](src/csharp/DotsAndBoxes.Tests/) — юніт-тести

---

## Microsoft.NET.Sdk

**Навіщо:** сучасний формат проєкту (.csproj), одна збірка для консолі та бібліотеки.

**Де використовується:**
- [src/csharp/DotsAndBoxes.Cli/DotsAndBoxes.Cli.csproj](src/csharp/DotsAndBoxes.Cli/DotsAndBoxes.Cli.csproj) — exe, net9.0, посилання на Core
- [src/csharp/DotsAndBoxes.Core/DotsAndBoxes.Core.csproj](src/csharp/DotsAndBoxes.Core/DotsAndBoxes.Core.csproj)
- [src/csharp/DotsAndBoxes.sln](src/csharp/DotsAndBoxes.sln) — солюшен для Visual Studio / Rider / dotnet CLI

---

## System.Text.Json (стандартна бібліотека)

**Навіщо:** парсинг та серіалізація JSON для протоколу JSON-RPC без зовнішніх залежностей.

**Де використовується:**
- [src/csharp/DotsAndBoxes.Cli/Program.cs](src/csharp/DotsAndBoxes.Cli/Program.cs) — читання запитів (method, params, id), формування відповідей (result/error)

---

## dotnet publish (self-contained)

**Навіщо:** збірка одного виконуваного файлу з .NET runtime для платформи (win-x64, osx-x64, linux-x64), щоб користувач не встановлював .NET окремо.

**Де використовується:**
- Виклик з [ui-electron/scripts/publish-cli.cjs](ui-electron/scripts/publish-cli.cjs): публікація у `resources/cli` для подальшої упаковки в Electron
