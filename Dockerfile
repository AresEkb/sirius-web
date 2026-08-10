# syntax=docker/dockerfile:1.7

# Stage 1: build the frontend bundle with Node.js
FROM node:24-slim AS frontend
WORKDIR /workspace

# Tokens for private npm registries referenced from .npmrc
ARG GITHUB_TOKEN=""
ARG METAMODEL_NEXUS_TOKEN=""
ENV GITHUB_TOKEN=$GITHUB_TOKEN \
    METAMODEL_NEXUS_TOKEN=$METAMODEL_NEXUS_TOKEN

COPY package.json package-lock.json turbo.json .npmrc ./
COPY packages ./packages
RUN npm ci
RUN npm run build

# Stage 2: build the Spring Boot fat-JAR with Maven
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /workspace

# Copy Maven sources
COPY mvnw mvnw.cmd settings.xml ./
COPY .mvn ./.mvn
COPY packages ./packages

# Reuse the freshly built frontend bundle as static resources of the backend
COPY --from=frontend /workspace/packages/sirius-web/frontend/sirius-web/dist \
     ./packages/sirius-web/backend/sirius-web-frontend/src/main/resources/static

# Credentials for private Maven repositories declared in settings.xml.
# Leave empty when only public Nexus repos are needed.
ARG GITHUB_USERNAME=""
ARG GITHUB_TOKEN=""
ARG GITHUB_PUBLISH_TOKEN=""
ARG METAMODEL_NEXUS_USERNAME=""
ARG METAMODEL_NEXUS_PASSWORD=""
ENV GITHUB_USERNAME=$GITHUB_USERNAME \
    GITHUB_TOKEN=$GITHUB_TOKEN \
    GITHUB_PUBLISH_TOKEN=$GITHUB_PUBLISH_TOKEN \
    METAMODEL_NEXUS_USERNAME=$METAMODEL_NEXUS_USERNAME \
    METAMODEL_NEXUS_PASSWORD=$METAMODEL_NEXUS_PASSWORD

RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -f packages/pom.xml -s settings.xml \
        -Dmaven.test.skip=true -Dcheckstyle.skip -Dcyclonedx.skip \
        clean package

# Stage 3: minimal runtime image
FROM eclipse-temurin:21-jre AS runtime
RUN useradd --create-home --shell /bin/false sirius-web
USER sirius-web
WORKDIR /home/sirius-web
COPY --from=backend \
     /workspace/packages/sirius-web/backend/sirius-web/target/sirius-web-*.jar \
     /home/sirius-web/sirius-web.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/home/sirius-web/sirius-web.jar"]
