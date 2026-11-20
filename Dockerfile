FROM eclipse-temurin:27-jdk AS backend-build
WORKDIR /app
COPY backend/mvnw backend/pom.xml ./
COPY backend/.mvn .mvn
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY backend/pmd-ruleset.xml ./
COPY backend/src src
RUN ./mvnw -B -q -DskipTests package

FROM eclipse-temurin:27-jre-alpine AS backend
RUN addgroup -S spring && adduser -S spring -G spring && mkdir /data && chown spring:spring /data
USER spring
WORKDIR /app
COPY --from=backend-build --chown=spring:spring /app/target/bimap-*.jar app.jar
ENV DB_PATH=/data/bimap.db
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=60s CMD wget -qO /dev/null http://127.0.0.1:8080/actuator/health/liveness || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

FROM node:26-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG GOOGLE_MAPS_KEY=""
RUN npm run build -- --define "GOOGLE_MAPS_KEY=\"$GOOGLE_MAPS_KEY\""

FROM nginxinc/nginx-unprivileged:alpine AS frontend
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 8080
