# Java

Використовується як ще один рушій гри: консольний CLI з JSON-RPC по stdin/stdout, збірка одним JAR.

---

## Java (JDK 17)

**Навіщо:** стабільна платформа, багато розробників знайомі з Java, зручно для консольних утиліт і тестів.

**Де використовується:**
- [src/java/src/main/java/dab/Cli.java](src/java/src/main/java/dab/Cli.java) — головний клас CLI: цикл stdin/stdout, Content-Length, JSON-RPC методи (init, applyMove, possibleMoves, botMove, gameOver)
- Логіка гри також реалізована в Java (у тому ж модулі або підпакетах)

---

## Gradle (Kotlin DSL)

**Навіщо:** збірка, залежності, запуск тестів, створення fat JAR (shadow) одним викликом.

**Де використовується:**
- [src/java/build.gradle.kts](src/java/build.gradle.kts) — плагіни java, application, shadow; Java 17; mainClass = dab.Cli
- [src/java/settings.gradle.kts](src/java/settings.gradle.kts), [gradle.properties](src/java/gradle.properties)
- Команди: `gradlew shadowJar`, `gradlew run` — використовуються в [publish-cli.cjs](ui-electron/scripts/publish-cli.cjs) та [spawnArgs.ts](ui-electron/electron/rpc/spawnArgs.ts)

---

## Gson

**Навіщо:** перетворення Java-об’єктів у JSON і назад для JSON-RPC без ручного парсингу рядків.

**Де використовується:**
- [src/java/build.gradle.kts](src/java/build.gradle.kts) — залежність `com.google.code.gson:gson`
- [src/java/src/main/java/dab/Cli.java](src/java/src/main/java/dab/Cli.java) — серіалізація/десеріалізація запитів і відповідей (state, edges, closedBoxes, move, reason тощо)

---

## JUnit 5 (Jupiter)

**Навіщо:** юніт- та інтеграційні тести логіки та контракту в одному стилі.

**Де використовується:**
- [src/java/build.gradle.kts](src/java/build.gradle.kts) — junit-bom, junit-jupiter, junit-platform-launcher
- [src/java/src/test/java/dab/CoreTest.java](src/java/src/test/java/dab/CoreTest.java) — тести ядра

---

## Shadow (Gradle plugin)

**Навіщо:** один «fat» JAR з усіма залежностями (наприклад, Gson), щоб запускати як `java -jar dab-cli.jar` без classpath.

**Де використовується:**
- [src/java/build.gradle.kts](src/java/build.gradle.kts) — плагін `com.gradleup.shadow`, задача shadowJar, ім’я архіву dab-cli.jar
- [ui-electron/scripts/publish-cli.cjs](ui-electron/scripts/publish-cli.cjs) — копіювання dab-cli.jar у `resources/cli`
