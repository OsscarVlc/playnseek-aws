#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# No continuar si el volumen de datos no está montado.
if ! mountpoint -q /data/dgraph; then
  echo "Error: el volumen de /data/dgraph no está montado." >&2
  exit 1
fi

sudo mkdir -p /data/dgraph/zero /data/dgraph/alpha

# Descargar las imágenes antes de iniciar el servicio.
sudo docker compose \
  -f "$PROJECT_DIR/docker-compose.aws.yml" pull

sudo tee /etc/systemd/system/playnseek-dgraph.service > /dev/null <<EOF
[Unit]
Description=Dgraph de PlayNSeek
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target
RequiresMountsFor=/data/dgraph
StartLimitIntervalSec=120
StartLimitBurst=3

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR
ExecStartPre=/usr/bin/mountpoint -q /data/dgraph
ExecStart=/usr/bin/docker compose -f $PROJECT_DIR/docker-compose.aws.yml up --abort-on-container-exit
ExecStop=/usr/bin/docker compose -f $PROJECT_DIR/docker-compose.aws.yml stop
Restart=always
RestartSec=10
TimeoutStopSec=90

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now playnseek-dgraph.service

echo "Servicio de Dgraph configurado."