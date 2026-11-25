#!/usr/bin/env bash
# Configura Nginx como proxy de la app (Express + Socket.io en 127.0.0.1:3000).
# Uso: bash scripts/setup-nginx.sh <dominio o IP>
#
# - Si ya existe un certificado de Let's Encrypt para el dominio, deja HTTPS en 443
#   y redirige todo HTTP a HTTPS.
# - Si no existe, deja solo HTTP. server_name debe ser el dominio para que el plugin
#   de Nginx de certbot encuentre este bloque y responda el reto HTTP-01.
# Se puede correr las veces que sea: siempre escribe la misma configuración.
set -euo pipefail

PUBLIC_HOST="${1:?Indica la IP publica o el dominio}"

if [[ ! "$PUBLIC_HOST" =~ ^[a-zA-Z0-9.-]+$ ]]; then
  echo "IP o dominio no válido." >&2
  exit 1
fi

CERT_DIR="/etc/letsencrypt/live/$PUBLIC_HOST"
CONF_FILE="/etc/nginx/conf.d/playnseek.conf"

# Bloque de proxy compartido por HTTP y HTTPS.
# Upgrade/Connection permiten WebSocket: con HTTPS el navegador abre wss:// y Nginx
# termina TLS y pasa la conexión a Socket.io como ws:// local.
PROXY_BLOCK=$(cat <<'EOF'
    client_max_body_size 16m; # multer acepta fotos de hasta 15 MB

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $playnseek_connection;
        proxy_read_timeout 120s;
    }
EOF
)

if sudo test -f "$CERT_DIR/fullchain.pem"; then
  sudo tee "$CONF_FILE" > /dev/null <<EOF
map \$http_upgrade \$playnseek_connection {
    default upgrade;
    '' close;
}

# HTTP: todo se redirige a HTTPS. La redirección va dentro de location / para que
# certbot pueda inyectar su location del reto HTTP-01 al renovar el certificado.
server {
    listen 80;
    server_name $PUBLIC_HOST _;

    location / {
        return 301 https://$PUBLIC_HOST\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name $PUBLIC_HOST;

    ssl_certificate     $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_session_cache   shared:PlayNSeekSSL:10m;
    ssl_session_timeout 1d;

    # El navegador recuerda por un día que el sitio solo se usa con HTTPS.
    add_header Strict-Transport-Security "max-age=86400" always;

$PROXY_BLOCK
}
EOF
  MODO="https://$PUBLIC_HOST"
else
  sudo tee "$CONF_FILE" > /dev/null <<EOF
map \$http_upgrade \$playnseek_connection {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name $PUBLIC_HOST;

$PROXY_BLOCK
}
EOF
  MODO="http://$PUBLIC_HOST (sin certificado todavía)"
fi

sudo nginx -t
sudo systemctl reload nginx

echo "Nginx configurado para $MODO"
