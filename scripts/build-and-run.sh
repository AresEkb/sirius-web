#!/bin/bash

set -Eeuo pipefail

npm ci
npm run build

rm -R packages/sirius-web/backend/sirius-web-frontend/src/main/resources/static
mkdir -p packages/sirius-web/backend/sirius-web-frontend/src/main/resources/static
cp -R packages/sirius-web/frontend/sirius-web/dist/* packages/sirius-web/backend/sirius-web-frontend/src/main/resources/static

JAVA_HOME=/usr/lib/jvm/java-1.17.0-openjdk-amd64 USERNAME=$GITHUB_USERNAME PASSWORD=$GITHUB_TOKEN ./mvnw clean verify -f packages/pom.xml -s settings.xml -DskipTests -Dcheckstyle.skip -Dcyclonedx.skip

/usr/lib/jvm/java-1.17.0-openjdk-amd64/bin/java -jar packages/sirius-web/backend/sirius-web/target/sirius-web-*.jar --spring.profiles.active=dev
