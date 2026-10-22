# ==============================================================================
# IronMind AI - backend image
#
# Multi-stage build: Maven resolves and compiles, the runtime stage keeps only
# the JRE and the packaged jar. The image runs as a non-root user.
# ==============================================================================

# ---------- Stage 1: build ----------
FROM maven:3.9-eclipse-temurin-25 AS build

WORKDIR /build

# Dependencies first: the layer is reused while only the sources change.
COPY pom.xml ./
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests

# ---------- Stage 2: runtime ----------
FROM eclipse-temurin:25-jre-alpine AS runtime

# curl is used by the container healthcheck.
RUN apk add --no-cache curl tzdata && \
    addgroup -S ironmind && adduser -S -G ironmind ironmind

WORKDIR /app

COPY --from=build /build/target/ironmind-backend-*.jar app.jar

USER ironmind

EXPOSE 8080

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseContainerSupport" \
    TZ=UTC

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD curl -fsS http://localhost:8080/api/v1/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
