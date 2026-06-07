# Etap 1: Budowanie aplikacji za pomocą Gradle
FROM gradle:8.5-jdk17-alpine AS builder
WORKDIR /app
COPY --chown=gradle:gradle . .
RUN gradle build --no-daemon -x test

# Etap 2: Uruchamianie aplikacji w lekkim kontenerze JRE
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*-SNAPSHOT.jar app.jar

# Port deweloperski/produkcyjny
EXPOSE 8080

# Uruchomienie aplikacji z profilem produkcyjnym
ENTRYPOINT ["java", "-jar", "app.jar"]
