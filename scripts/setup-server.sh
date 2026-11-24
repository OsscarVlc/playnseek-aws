#!/usr/bin/env bash
set -euo pipefail

sudo dnf install -y git docker nginx nodejs24 nodejs24-npm

# Iniciar los servicios y habilitarlos al encender la instancia.
sudo systemctl enable --now docker
sudo systemctl enable --now nginx

# Instalar Docker Compose con una versión fija
COMPOSE_VERSION="v5.6.0"
COMPOSE_TMP="$(mktemp -d)"

curl --fail --show-error --location \
  "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
  -o "$COMPOSE_TMP/docker-compose"

sudo install -d /usr/local/lib/docker/cli-plugins
sudo install -m 0755 "$COMPOSE_TMP/docker-compose" \
  /usr/local/lib/docker/cli-plugins/docker-compose

rm -rf "$COMPOSE_TMP"

sudo docker compose version

echo "Instalación completada."