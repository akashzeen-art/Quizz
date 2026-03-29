# Spring Boot API for Render (Java not available as a native runtime — use Docker)
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests clean package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN groupadd --system spring && useradd --system --gid spring spring \
  && mkdir -p uploads && chown spring:spring uploads
COPY --from=build /app/target/quiz-api-1.0.0.jar app.jar
RUN chown spring:spring app.jar
USER spring:spring
# Atlas TLS; tune heap for small instances (Render free = 512MB RAM)
ENV JAVA_OPTS="-Djdk.tls.client.protocols=TLSv1.2 -Xmx384m -Xms256m"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
