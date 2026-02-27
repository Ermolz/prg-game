plugins {
    java
    application
    id("com.gradleup.shadow") version "9.2.0"
    `maven-publish`
}

group = "dab"
version = "1.0.0"

repositories {
    mavenCentral()
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

application {
    mainClass.set("dab.Cli")
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
}

dependencies {
    implementation("com.google.code.gson:gson:2.10.1")
    testImplementation(platform("org.junit:junit-bom:5.10.0"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.shadowJar {
    archiveBaseName.set("dab-cli")
    archiveClassifier.set("")
    archiveVersion.set("")
}

publishing {
    repositories {
        maven {
            name = "GitHubPackages"
            url = uri(
                "https://maven.pkg.github.com/" +
                (project.findProperty("githubRepository")?.toString() ?: System.getenv("GITHUB_REPOSITORY") ?: "owner/repo")
            )
            credentials {
                username = project.findProperty("gpr.user")?.toString() ?: System.getenv("GITHUB_ACTOR") ?: ""
                password = project.findProperty("gpr.key")?.toString() ?: System.getenv("GITHUB_TOKEN") ?: ""
            }
        }
    }
    publications {
        create<MavenPublication>("shadow") {
            groupId = "dab"
            artifactId = "dab-cli"
            version = project.version.toString()
            artifact(tasks.shadowJar.get()) {
                classifier = ""
                extension = "jar"
            }
        }
    }
}

tasks.test {
    useJUnitPlatform()
    testLogging {
        events("passed", "skipped", "failed")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
    }
}
