#!/bin/bash

set -Eeuo pipefail

echo Run local development version of a database for BPMS Web Application

# Don't forget to add yourself to the docker group
# sudo gpasswd -a $USER docker
# Reboot system to apply settings

docker create -p 5438:5432 --name siriusweb \
  -e POSTGRES_USER=dbuser \
  -e POSTGRES_PASSWORD=dbpwd \
  -e POSTGRES_DB=sirius-web-db \
  --restart unless-stopped \
  postgres:14.5-alpine || true
docker stop siriusweb || true
docker start siriusweb
