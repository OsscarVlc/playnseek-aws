#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
APP_USER="$(id -un)"
NODE_BIN="$(command -v node)"

if [[ "$APP_USER" == "root" ]]; then
  echo "Ejecuta este script sin sudo." >&2
  exit 1
fi

test -f "$PROJECT_DIR/BACKEND/.env"
test -f "$PROJECT_DIR/BACKEND/dist/index.js"

sudo tee /etc/systemd/system/playnseek-app.service > /dev/null <<EOF
[Unit]
Description=Aplicacion PlayNSeek
Wants=network-online.target playnseek-dgraph.service
After=network-online.target playnseek-dgraph.service
StartLimitIntervalSec=0

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$PROJECT_DIR/BACKEND
Environment=NODE_ENV=production
ExecStart=$NODE_BIN $PROJECT_DIR/BACKEND/dist/index.js
Restart=always
RestartSec=10
TimeoutStopSec=30
UMask=0077

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable playnseek-app.service
sudo systemctl restart playnseek-app.service

echo "Servicio de la aplicación configurado."