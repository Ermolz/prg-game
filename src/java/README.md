# Dots and Boxes — Java (Gradle 9.3.1)

- **Run tests:** from repo root `make java-tests`, or here `bash ./gradlew test`.
- **One-time:** if `gradle/wrapper/gradle-wrapper.jar` is missing, from repo root run (Gradle must be in PATH):
  ```bash
  cd src/java
  gradle -b wrapper.gradle wrapper --gradle-version 9.3.1
  ```
  Then use only `./gradlew` (or `make java-tests`); do not rely on system `gradle` again.
