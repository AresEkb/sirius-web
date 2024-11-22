#!/bin/bash

set -Eeuo pipefail

# Update branches

# git restore . && git switch master && git pull
# git switch den/enh/scripts && git pull origin master --rebase && git push -f
# git switch den/enh/scripts && (git pull origin master --rebase || (sed -i '/^<<<<<<< HEAD$/,/^>>>>>>> / { /^<<<<<<< HEAD$/d; /^>>>>>>> /d; /^=======/ { h; d; }; /^=======/! { x; G; x; } }' CHANGELOG.adoc && git add CHANGELOG.adoc && git rebase --continue))
# git switch den/enh/scripts && (git pull origin master --rebase || (sed -i '/^<<<<<<< HEAD$/,/^>>>>>>> / { /^<<<<<<< HEAD$/d; /^>>>>>>> /d; /^=======/ { h; d; }; /^=======/! { x; G; x; } }' CHANGELOG.adoc && git add CHANGELOG.adoc && git rebase --continue)) && git push -f
# git rebase --continue && git push -f

# Apply patches

git switch metamodel
git reset --hard origin/master
git cherry-pick den/enh/scripts
git cherry-pick den/enh/edit-plugins-localization
git cherry-pick den/fix/resource-load-exception
git cherry-pick den/enh/add-fronted-exports
git cherry-pick den/enh/type-exports
git cherry-pick fro/fix/handle-warning
git cherry-pick den/fix/drop-tree-clear-references --strategy-option theirs
git cherry-pick den/enh/bendpoints-on-top --strategy-option theirs
git cherry-pick den/enh/remove-unused-palette-buttons --strategy-option theirs
git cherry-pick den/fix/no-empty-diagram-selection-delete --strategy-option theirs
git cherry-pick den/fix/use-key-codes --strategy-option theirs
git cherry-pick den/enh/sorted-tree-iterator
git cherry-pick den/enh/improve-tables
git cherry-pick den/enh/set-default-outside-label-width
echo Success

# Publish frontend

# git switch den/enh/scripts && ./scripts/patch.sh && find -type f -regextype egrep -iregex '.*\.(json|ts|tsx)' -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/backend/*' -exec sed -i 's/@eclipse-sirius/@metamodeldev/' {} \; && npm ci && npx turbo run format && pushd ./packages/diagrams/frontend/sirius-components-diagrams && npm run format && popd && pushd ./packages/forms/frontend/sirius-components-forms && npm run format && popd && pushd ./packages/trees/frontend/sirius-components-trees && npm run format && popd && pushd ./packages/sirius-web/frontend/sirius-web-application && npm run format && popd && npm run build
# npm publish --workspaces --force
# cd ../metamodel/metamodel/frontend && bun pm cache rm && (rm -R bun.lock node_modules metamodel/node_modules metamodel-application/node_modules/ || true) && bun install

# Publish backend

# JAVA_HOME=/usr/lib/jvm/zulu17 USERNAME=$GITHUB_USERNAME PASSWORD=$GITHUB_TOKEN mvn clean verify -DargLine="-Duser.country=US -Duser.language=en" -f packages/pom.xml -s settings.xml
# rm -R ~/.m2/repository/org/eclipse/sirius/
# JAVA_HOME=/usr/lib/jvm/zulu17 USERNAME=$GITHUB_USERNAME PASSWORD=$GITHUB_TOKEN mvn install -f packages/pom.xml -s settings.xml -DskipTests -Dcheckstyle.skip
# JAVA_HOME=/usr/lib/jvm/zulu17 USERNAME=$GITHUB_USERNAME PASSWORD=$GITHUB_PUBLISH_TOKEN mvn deploy -f packages/pom.xml -s settings.xml -DskipTests -Dcheckstyle.skip
