#!/bin/bash

set -Eeuo pipefail

packages=(
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-browser
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-charts
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-core
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-deck
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-diagrams
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-formdescriptioneditors
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-forms
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-gantt
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-omnibox
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-palette
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-portals
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-selection
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-tables
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-trees
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-tsconfig
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-validation
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-widget-reference
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-components-widget-table
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-web-application
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-web-papaya
https://api.github.com/orgs/metamodeldev/packages/npm/sirius-web-view-fork
)

for pkg in ${packages[@]}; do
  echo "Deleting $pkg"
  curl -L \
    -X DELETE \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $GITHUB_DELETE_TOKEN" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "$pkg"
done
