# BiMap IAM Service — production image.
#
# Two stages, and the runtime stage never sees the JDK, Maven, or the source. The Spring Boot jar
# is unpacked into its layers so a code change rebuilds one thin layer instead of re-shipping
# every dependency.
#
# Author: Khova Krishna Pilato

ARG JAVA_VERSION=26

# ── Build ────────────────────────────────────────────────────────────────────
FROM eclipse-temurin:${JAVA_VERSION}-jdk AS build
WORKDIR /build

# Dependency resolution is cached on its own layer: the poms change far less often than the code.
# All three poms are needed because the reactor refuses to start with a declared module missing,
# even one we are not building here.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
COPY platform-core/pom.xml platform-core/
COPY iam-service/pom.xml iam-service/
COPY business-service/pom.xml business-service/
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline -pl platform-core,iam-service -am -DskipTests

COPY platform-core/src platform-core/src
COPY iam-service/src iam-service/src
RUN ./mvnw -B -q package -pl platform-core,iam-service -am -DskipTests

# Layers, so Docker can cache dependencies separately from application classes.
RUN java -Djarmode=tools -jar iam-service/target/iam-service-*.jar extract --layers --launcher --destination /build/extracted

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM eclipse-temurin:${JAVA_VERSION}-jre AS runtime

LABEL org.opencontainers.image.title="BiMap IAM Service" \
      org.opencontainers.image.description="Identity and access management for BiMap" \
      org.opencontainers.image.authors="Khova Krishna Pilato <krishnak.pilato@gmail.com>" \
      org.opencontainers.image.source="https://github.com/krishnapilato/bimap" \
      org.opencontainers.image.licenses="Proprietary"

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl tini \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --create-home --uid 10001 bimap

WORKDIR /app
USER bimap

COPY --from=build --chown=bimap:bimap /build/extracted/dependencies/ ./
COPY --from=build --chown=bimap:bimap /build/extracted/spring-boot-loader/ ./
COPY --from=build --chown=bimap:bimap /build/extracted/snapshot-dependencies/ ./
COPY --from=build --chown=bimap:bimap /build/extracted/application/ ./

ENV LOG_PATH=/app/logs \
    SPRING_PROFILES_ACTIVE=prod \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError -XX:+UseContainerSupport -Djava.security.egd=file:/dev/urandom -Duser.timezone=UTC"

EXPOSE 9843

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost:9843/actuator/health/readiness || exit 1

# tini reaps zombies and forwards SIGTERM, which is what makes graceful shutdown actually graceful.
ENTRYPOINT ["/usr/bin/tini", "--", "java", "org.springframework.boot.loader.launch.JarLauncher"]
