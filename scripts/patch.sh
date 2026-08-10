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
git cherry-pick den/enh/add-fronted-exports
git cherry-pick den/enh/type-exports
git cherry-pick fro/fix/handle-warning
git cherry-pick den/fix/drop-tree-clear-references --strategy-option theirs
git cherry-pick den/enh/bendpoints-on-top --strategy-option theirs
git cherry-pick den/enh/remove-unused-palette-buttons --strategy-option theirs
git cherry-pick den/fix/use-key-codes --strategy-option theirs
git cherry-pick den/enh/sorted-tree-iterator
git cherry-pick den/enh/improve-tables
git cherry-pick den/enh/set-default-outside-label-width
git cherry-pick den/enh/any-node-type-child-nodes-draggable
git cherry-pick den/fix/preserve-node-id-on-container-change --strategy-option theirs
git cherry-pick den/fix/remove-aria-disabled --strategy-option theirs
git cherry-pick den/enh/drop-dialog
git cherry-pick den/fix/forms-no-commit-on-completion-blur
git cherry-pick den/fix/form-widget-remount-on-refresh
git cherry-pick den/enh/tree-context-menu-expand-select
git cherry-pick den/fix/validator-factory-singleton
git cherry-pick den/enh/diagram-reflect-workbench-selection
git cherry-pick den/enh/diagram-node-double-click-navigation
git cherry-pick den/enh/keep-auto-route-on-edge-click
git cherry-pick den/enh/single-click-tool-dialog
git cherry-pick den/fix/emf-validation-adapter-factory-reuse
git cherry-pick den/enh/label-rotation
git cherry-pick den/enh/bpmn-default-flow-marker
git cherry-pick den/enh/persist-selection-on-node-recreate
git cherry-pick den/enh/node-resize-change-handler
git cherry-pick den/enh/swimlane-resize-helper-lines
git cherry-pick den/enh/multi-select-resize-scope
git cherry-pick den/fix/reparent-drop-position
git cherry-pick den/fix/resize-snap-to-grid
git cherry-pick den/fix/diagram-grid-alignment
git cherry-pick den/fix/border-node-drop-on-border
git cherry-pick den/fix/palette-tool-contribution-scope
git cherry-pick den/fix/palette-null-payload
git cherry-pick den/enh/select-model-on-pane-click
git cherry-pick den/fix/rubber-band-edge-selection
git cherry-pick den/enh/diagram-select-all
git cherry-pick den/fix/clear-selection-on-delete
git cherry-pick den/fix/error-toast-variant
git cherry-pick den/enh/form-label-for-input
git cherry-pick den/fix/reuse-elk-layout-engine
git cherry-pick den/fix/input-failure-payload
git cherry-pick den/fix/layout-request-waits-its-turn
git cherry-pick den/fix/keep-server-placed-node-position
git cherry-pick den/fix/bounded-meter-tags
git cherry-pick den/fix/measured-follows-the-layout
git cherry-pick den/fix/gesture-in-a-mixed-change-batch
echo Success

# Publish frontend

# git switch den/enh/scripts && ./scripts/patch.sh && find -type f -regextype egrep -iregex '.*\.(json|ts|tsx)' -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/backend/*' -exec sed -i 's/@eclipse-sirius/@metamodeldev/' {} \; && npm ci && npx turbo run format && pushd ./packages/diagrams/frontend/sirius-components-diagrams && npm run format && popd && pushd ./packages/forms/frontend/sirius-components-forms && npm run format && popd && pushd ./packages/trees/frontend/sirius-components-trees && npm run format && popd && pushd ./packages/sirius-web/frontend/sirius-web && npm run format && popd && pushd ./packages/sirius-web/frontend/sirius-web-application && npm run format && popd && npm run build
# npm publish --workspaces --force
# cd ../metamodel/metamodel/frontend && bun pm cache rm && (rm -R bun.lock node_modules metamodel/node_modules metamodel-application/node_modules/ || true) && bun install

# Publish backend

# JAVA_HOME=/usr/lib/jvm/zulu21 USERNAME=$GITHUB_USERNAME PASSWORD=$GITHUB_TOKEN mvn clean verify -DargLine="-Duser.country=US -Duser.language=en" -f packages/pom.xml -s settings.xml && JAVA_HOME=/usr/lib/jvm/zulu21 USERNAME=$GITHUB_USERNAME PASSWORD=$GITHUB_TOKEN mvn install -f packages/pom.xml -s settings.xml -DskipTests -Dcheckstyle.skip && JAVA_HOME=/usr/lib/jvm/zulu21 USERNAME=$GITHUB_USERNAME PASSWORD=$GITHUB_PUBLISH_TOKEN mvn deploy -f packages/pom.xml -s settings.xml -DskipTests -Dcheckstyle.skip
