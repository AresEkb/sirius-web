#!/bin/bash

set -Eeuo pipefail

# Update branches

# git restore . && git switch master && git pull
# git switch den/enh/scripts && git pull origin master --rebase && git push -f
# git rebase --continue && git push -f

# Apply patches

git switch metamodel
git reset --hard origin/master
git cherry-pick den/enh/scripts
git cherry-pick den/enh/frontend-i18n
git cherry-pick den/enh/edit-plugins-localization
git cherry-pick den/fix/resource-load-exception
git cherry-pick den/enh/add-fronted-exports
git cherry-pick den/enh/type-exports
git cherry-pick fro/fix/handle-warning
git cherry-pick den/fix/palette-react-keys2
git cherry-pick den/fix/drop-tree-clear-references --strategy-option theirs
git cherry-pick den/enh/bendpoints-on-top --strategy-option theirs
git cherry-pick den/enh/remove-unused-palette-buttons --strategy-option theirs
git cherry-pick den/fix/cross-reference-adapter-removal --strategy-option theirs
git cherry-pick den/fix/no-empty-diagram-selection-delete --strategy-option theirs
echo Success

# Publish frontend

# ./scripts/patch.sh && find -type f -regextype egrep -iregex '.*\.(json|ts|tsx)' -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/backend/*' -exec sed -i 's/@eclipse-sirius/@metamodeldev/' {} \; && npm ci && npx turbo run format && pushd ./packages/forms/frontend/sirius-components-forms && npm run format && popd && pushd ./packages/sirius-web/frontend/sirius-web-application && npm run format && popd && npm run build
# ./scripts/package-delete-npm.sh && ./scripts/package-list-npm.sh
# npm publish --workspaces
# cd ../metamodel/metamodel/frontend && rm -R bun.lock node_modules && bun install

# Publish backend

# JAVA_HOME=/usr/lib/jvm/java-1.17.0-openjdk-amd64 USERNAME=$GITHUB_USERNAME PASSWORD=$GITHUB_TOKEN mvn clean verify -DargLine="-Duser.country=US -Duser.language=en" -f packages/pom.xml -s settings.xml
# rm -R ~/.m2/repository/org/eclipse/sirius/
# JAVA_HOME=/usr/lib/jvm/java-1.17.0-openjdk-amd64 USERNAME=$GITHUB_USERNAME PASSWORD=$GITHUB_TOKEN mvn install -f packages/pom.xml -s settings.xml -DskipTests -Dcheckstyle.skip
# ./scripts/package-delete-maven.sh && ./scripts/package-list-maven.sh
# JAVA_HOME=/usr/lib/jvm/java-1.17.0-openjdk-amd64 USERNAME=$GITHUB_USERNAME PASSWORD=$GITHUB_PUBLISH_TOKEN mvn deploy -f packages/pom.xml -s settings.xml -DskipTests -Dcheckstyle.skip
