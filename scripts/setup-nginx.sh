#!/usr/bin/env bash
set -euo pipefail

PUBLIC_HOST="${1:?Indica la IP publica o el dominio}"

if [[ ! "$PUBLIC_HOST" =~ ^[a-zA-Z0-9.-]+$ ]]; then
  echo "IP o dominio no válido." >&2
  exit 1
fi

sudo tee /etc/nginx/conf.d/playnseek.conf > /dev/null <<EOF
map \$http_upgrade \$playnseek_connection {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name $PUBLIC_HOST;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$playnseek_connection;
        proxy_read_timeout 120s;
    }
}
EOF

sudo nginx -t
sudo systemctl reload nginx

echo "Nginx configurado para http://$PUBLIC_HOST"