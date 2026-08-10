#!/bin/bash

set -Eeuo pipefail

# Update branches

# git restore . && git switch master && git pull
# git switch den/enh/scripts && git pull origin master --rebase && git push -f
# git switch den/enh/scripts && (git pull origin master --rebase || (sed -i '/^<<<<<<< HEAD$/,/^>>>>>>> / { /^<<<<<<< HEAD$/d; /^>>>>>>> /d; /^=======/ { h; d; }; /^=======/! { x; G; x; } }' CHANGELOG.adoc && git add CHANGELOG.adoc && git rebase --continue))
# git switch den/enh/scripts && (git pull origin master --rebase || (sed -i '/^<<<<<<< HEAD$/,/^>>>>>>> / { /^<<<<<<< HEAD$/d; /^>>>>>>> /d; /^=======/ { h; d; }; /^=======/! { x; G; x; } }' CHANGELOG.adoc && git add CHANGELOG.adoc && git rebase --continue)) && git push -f
# git rebase --continue && git push -f

# Replay checked resolutions only when Git produces the same normalized conflict.
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
rerere_git=(git -c rerere.enabled=true -c rerere.autoupdate=true)

pick_topic() {
  local topic=$1 base first patch_commit cache conflicts id file preimage resolution resolved output
  base=$(git merge-base origin/master "$topic")
  patch_commit=$(git rev-parse "$topic")
  first=$(git rev-list --reverse "$base..$topic" | sed -n '1p')
  [ -n "$first" ] || return 0

  # Apply the net diff like a single-commit topic, even before its history is squashed.
  if [ "$first" != "$patch_commit" ]; then
    patch_commit=$(
      GIT_AUTHOR_NAME=$(git show -s --format=%an "$first") \
      GIT_AUTHOR_EMAIL=$(git show -s --format=%ae "$first") \
      GIT_AUTHOR_DATE=$(git show -s --format=%aI "$first") \
        git commit-tree "$topic^{tree}" -p "$base" -m "$(git show -s --format=%s "$first")"
    )
  fi

  if output=$("${rerere_git[@]}" cherry-pick --empty=drop "$patch_commit" 2>&1); then
    printf '%s\n' "$output"
    return
  fi

  cache=$(git rev-parse --path-format=absolute --git-path rr-cache)
  conflicts=$(git rev-parse --git-path MERGE_RR)
  if [ ! -f "$conflicts" ]; then
    printf '%s\n' "$output" >&2
    return 1
  fi

  while IFS=$'\t' read -r -d '' id file; do
    preimage="$cache/${id%%.*}/preimage${id#${id%%.*}}"
    [ -f "$preimage" ] || continue
    resolution="$script_dir/patch-resolutions/$(git hash-object "$preimage").diff"
    [ -f "$resolution" ] || continue
    resolved=$(mktemp)
    if ! patch --batch --silent --fuzz=0 --output="$resolved" "$preimage" < "$resolution"; then
      rm -- "$resolved"
      printf '%s\n' "$output" >&2
      return 1
    fi
    cat -- "$resolved" > "$file"
    rm -- "$resolved"
    git add -- "$file"
  done < "$conflicts"

  if [ -n "$(git diff --name-only --diff-filter=U)" ]; then
    printf '%s\nNo saved resolution for these paths in %s:\n' "$output" "$topic" >&2
    git diff --name-only --diff-filter=U >&2
    return 1
  fi
  printf 'Resolved known overlaps in %s\n' "$topic"
  GIT_EDITOR=true "${rerere_git[@]}" cherry-pick --continue
}

# Apply patches

git switch metamodel
git reset --hard origin/master
pick_topic den/enh/scripts
git cherry-pick den/enh/edit-plugins-localization
pick_topic den/enh/add-fronted-exports
git cherry-pick den/enh/type-exports
git cherry-pick fro/fix/handle-warning
git cherry-pick den/fix/drop-tree-clear-references --strategy-option theirs
# Apply the 2026.7 code change without depending on the topic rebased for 2026.12.
git apply --unidiff-zero --index "$script_dir/patch-resolutions/bendpoints-on-top-2026.7.diff"
git commit -m 'Keep edge bending points above line segments'
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
pick_topic den/enh/diagram-reflect-workbench-selection
git cherry-pick den/enh/diagram-node-double-click-navigation
git cherry-pick den/enh/keep-auto-route-on-edge-click
git cherry-pick den/enh/single-click-tool-dialog
git cherry-pick den/fix/emf-validation-adapter-factory-reuse
git cherry-pick den/fix/undo-restore-deleted-object-references
git cherry-pick den/fix/redo-initial-diagram-layout
git cherry-pick den/enh/label-rotation
git cherry-pick den/enh/bpmn-default-flow-marker
git cherry-pick den/enh/persist-selection-on-node-recreate
git cherry-pick den/enh/node-resize-change-handler
pick_topic den/enh/swimlane-resize-helper-lines
git cherry-pick den/enh/multi-select-resize-scope
pick_topic den/fix/reparent-drop-position
pick_topic den/fix/resize-snap-to-grid
git cherry-pick den/fix/diagram-grid-alignment
git cherry-pick den/fix/border-node-drop-on-border
git cherry-pick den/fix/palette-tool-contribution-scope
pick_topic den/fix/palette-null-payload
git cherry-pick den/enh/select-model-on-pane-click --strategy-option theirs
git cherry-pick den/fix/rubber-band-edge-selection
git cherry-pick den/enh/diagram-select-all
git cherry-pick den/fix/clear-selection-on-delete
git cherry-pick den/fix/error-toast-variant
git cherry-pick den/enh/form-label-for-input
git cherry-pick den/fix/reuse-elk-layout-engine
pick_topic den/fix/input-failure-payload
git cherry-pick den/fix/layout-request-waits-its-turn
git cherry-pick den/fix/keep-server-placed-node-position
git cherry-pick den/fix/bounded-meter-tags
git cherry-pick den/fix/measured-follows-the-layout
git cherry-pick den/fix/gesture-in-a-mixed-change-batch

# Apply the Sirius changes formerly carried by the frontend package patches.
pick_topic den/enh/palette-configuration-key
pick_topic den/fix/connector-handles-preserve-selection
pick_topic den/enh/collapsible-property-groups
pick_topic den/enh/diagram-export-dom-hooks
pick_topic den/enh/diagram-palette-panel-api
pick_topic den/enh/floating-edge-endpoints
pick_topic den/fix/diagram-multi-node-drop-compatibility
pick_topic den/fix/keep-manual-creation-position
pick_topic den/fix/rectilinear-edge-geometry
pick_topic den/fix/scope-diagram-keyboard-shortcuts
pick_topic den/fix/batch-connection-handle-refresh
pick_topic den/fix/index-diagram-layout-nodes
pick_topic den/fix/index-edge-crossings
pick_topic den/fix/scope-diagram-viewport-updates
pick_topic den/fix/share-diagram-edge-markers
pick_topic den/fix/subscribe-to-zoom-during-label-interaction
pick_topic den/fix/update-only-active-helper-lines
pick_topic den/fix/use-stable-diagram-store-actions
pick_topic den/fix/virtualize-palette-search
echo Success

# Publish frontend

# git switch den/enh/scripts && ./scripts/patch.sh && find -type f -regextype egrep -iregex '.*\.(json|ts|tsx)' -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/backend/*' -exec sed -i 's/@eclipse-sirius/@metamodeldev/' {} \; && npm ci && npx turbo run format && pushd ./packages/diagrams/frontend/sirius-components-diagrams && npm run format && popd && pushd ./packages/forms/frontend/sirius-components-forms && npm run format && popd && pushd ./packages/trees/frontend/sirius-components-trees && npm run format && popd && pushd ./packages/sirius-web/frontend/sirius-web && npm run format && popd && pushd ./packages/sirius-web/frontend/sirius-web-application && npm run format && popd && npm run build
# npm publish --workspaces --force
# cd ../metamodel/metamodel/frontend && bun pm cache rm && (rm -R bun.lock node_modules metamodel/node_modules metamodel-application/node_modules/ || true) && bun install

# Publish backend
# Keep the Surefire argLine available for JaCoCo. To check the CI coverage thresholds after verify:
# /usr/lib/jvm/zulu21/bin/jshell scripts/check-coverage.jsh

# JAVA_HOME=/usr/lib/jvm/zulu21 USERNAME=$GITHUB_USERNAME PASSWORD=$GITHUB_TOKEN JAVA_TOOL_OPTIONS="-Duser.country=US -Duser.language=en" mvn clean verify -f packages/pom.xml -s settings.xml && JAVA_HOME=/usr/lib/jvm/zulu21 USERNAME=$GITHUB_USERNAME PASSWORD=$GITHUB_TOKEN mvn install -f packages/pom.xml -s settings.xml -DskipTests -Dcheckstyle.skip && JAVA_HOME=/usr/lib/jvm/zulu21 USERNAME=$GITHUB_USERNAME PASSWORD=$GITHUB_PUBLISH_TOKEN mvn deploy -f packages/pom.xml -s settings.xml -DskipTests -Dcheckstyle.skip
