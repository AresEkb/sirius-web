#!/bin/bash

set -Eeuo pipefail

curl -L \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_PUBLISH_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  'https://api.github.com/orgs/metamodeldev/packages?package_type=npm&per_page=100' | tee /dev/stderr | jq '.[].url'
