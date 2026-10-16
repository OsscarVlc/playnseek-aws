#!/usr/bin/env bash
set -euo pipefail

sudo dnf install -y git docker nginx nodejs24 nodejs24-npm

# Iniciar los servicios y habilitarlos al encender la instancia.
sudo systemctl enable --now docker
sudo systemctl enable --now nginx

echo "Instalación completada."