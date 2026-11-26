#!/usr/bin/env bash
# Activa HTTPS con Let's Encrypt (certbot + plugin de Nginx) en la EC2 de PlayNSeek.
#
# Uso dentro de EC2:
#   bash scripts/setup-https.sh [dominio] [correo]
#   - dominio: por defecto se toma el host de APP_URL en BACKEND/.env
#              (Terraform lo escribe como https://<ip-con-guiones>.sslip.io)
#   - correo:  opcional, para registrar la cuenta de Let's Encrypt
#
# Es idempotente: si el certificado ya existe y no está por vencer, no pide otro.
# Los certificados se guardan en el volumen EBS (/data/dgraph/letsencrypt) para que
# sobrevivan si Terraform recrea la instancia y no se vuelvan a pedir (Let's Encrypt
# limita cuántos certificados idénticos se emiten por semana).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/BACKEND/.env"
PERSISTENT_DIR="/data/dgraph/letsencrypt"

# 1. Dominio ---------------------------------------------------------------------
DOMAIN="${1:-}"
if [[ -z "$DOMAIN" && -f "$ENV_FILE" ]]; then
  APP_URL="$(grep -E '^APP_URL=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
  DOMAIN="$(sed -E 's#^[a-z]+://##; s#[:/].*$##' <<< "$APP_URL")"
fi
EMAIL="${2:-}"

if [[ -z "$DOMAIN" ]]; then
  echo "No se indicó dominio y no hay APP_URL en $ENV_FILE." >&2
  exit 1
fi

if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9.-]+$ ]]; then
  echo "Dominio no válido: $DOMAIN" >&2
  exit 1
fi

# Let's Encrypt no emite certificados para una IP: en ese caso se deja HTTP.
if [[ "$DOMAIN" =~ ^[0-9.]+$ ]]; then
  echo "APP_URL apunta a una IP ($DOMAIN); se omite HTTPS."
  exit 0
fi

# Let's Encrypt valida entrando a http://<dominio>, así que el dominio debe apuntar
# a esta instancia. En una EC2 recién creada la Elastic IP se asocia unos segundos
# después de arrancar: se espera hasta 5 minutos a que la IP pública coincida.
IP_ESPERADA="$(grep -oE '^[0-9]+-[0-9]+-[0-9]+-[0-9]+' <<< "$DOMAIN" | tr '-' '.' || true)"
if [[ -n "$IP_ESPERADA" ]]; then
  for _ in $(seq 1 30); do
    IMDS_TOKEN="$(curl -sf -X PUT http://169.254.169.254/latest/api/token \
      -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' || true)"
    IP_ACTUAL="$(curl -sf -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" \
      http://169.254.169.254/latest/meta-data/public-ipv4 || true)"
    [[ "$IP_ACTUAL" == "$IP_ESPERADA" ]] && break
    echo "Esperando a que la Elastic IP $IP_ESPERADA se asocie (actual: ${IP_ACTUAL:-ninguna})..."
    sleep 10
  done
fi

# 2. Instalar certbot y el plugin de Nginx ------------------------------------------
# AL2023 (2023.3 o posterior) trae certbot y python3-certbot-nginx en su repositorio
# y el timer certbot-renew.timer. Si no están disponibles, se usa pip en un venv
# (método oficial de certbot para distribuciones sin paquete).
RENEW_TIMER="certbot-renew.timer"
if ! command -v certbot > /dev/null; then
  if ! sudo dnf install -y certbot python3-certbot-nginx; then
    echo "certbot no está en dnf; se instala con pip en /opt/certbot"
    sudo dnf install -y python3 augeas-libs
    sudo python3 -m venv /opt/certbot
    sudo /opt/certbot/bin/pip install --upgrade pip
    sudo /opt/certbot/bin/pip install certbot certbot-nginx
    sudo ln -sf /opt/certbot/bin/certbot /usr/bin/certbot
  fi
fi

# Con la instalación por pip no existe el timer del paquete: se crea uno equivalente.
if ! systemctl cat "$RENEW_TIMER" > /dev/null 2>&1; then
  RENEW_TIMER="playnseek-certbot-renew.timer"
  sudo tee /etc/systemd/system/playnseek-certbot-renew.service > /dev/null <<'EOF'
[Unit]
Description=Renovar certificados de Let's Encrypt

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet
EOF
  sudo tee /etc/systemd/system/playnseek-certbot-renew.timer > /dev/null <<'EOF'
[Unit]
Description=Revisar dos veces al día si hay que renovar certificados

[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=1h
Persistent=true

[Install]
WantedBy=timers.target
EOF
fi

# 3. Guardar /etc/letsencrypt en el volumen EBS ------------------------------------
if mountpoint -q /data/dgraph; then
  sudo mkdir -p "$PERSISTENT_DIR"
  if [[ -d /etc/letsencrypt && ! -L /etc/letsencrypt ]]; then
    # copia lo que hubiera (sin pisar lo que ya está en el volumen) y deja un enlace
    sudo cp -an /etc/letsencrypt/. "$PERSISTENT_DIR"/
    sudo rm -rf /etc/letsencrypt
  fi
  sudo ln -sfn "$PERSISTENT_DIR" /etc/letsencrypt
else
  echo "Aviso: /data/dgraph no está montado; los certificados quedan en el disco del sistema."
fi

# Recargar Nginx cada vez que se renueve el certificado.
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh > /dev/null <<'EOF'
#!/usr/bin/env bash
systemctl reload nginx
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

# 4. Nginx en HTTP con server_name = dominio (necesario para el reto HTTP-01) --------
bash "$SCRIPT_DIR/setup-nginx.sh" "$DOMAIN"

# 5. Pedir el certificado -----------------------------------------------------------
# certonly: certbot solo obtiene el certificado; la configuración de Nginx la escribe
# setup-nginx.sh, así siempre es la misma y certbot no la modifica.
# --keep-until-expiring: si el certificado existe y no está por vencer, no hace nada.
if [[ -n "$EMAIL" ]]; then
  CUENTA=(--email "$EMAIL")
else
  CUENTA=(--register-unsafely-without-email)
fi

sudo certbot certonly --nginx \
  -d "$DOMAIN" \
  --non-interactive --agree-tos "${CUENTA[@]}" \
  --keep-until-expiring

# 6. Nginx con HTTPS y redirección HTTP -> HTTPS ---------------------------------------
bash "$SCRIPT_DIR/setup-nginx.sh" "$DOMAIN"

# 7. Renovación automática -----------------------------------------------------------
sudo systemctl daemon-reload
sudo systemctl enable --now "$RENEW_TIMER"
systemctl list-timers "$RENEW_TIMER" --no-pager

# No se corre "certbot renew --dry-run": en una EC2 recién creada llegó a quedarse
# colgado varios minutos y, como certbot no permite dos ejecuciones a la vez, hacía
# fallar el siguiente Deploy. La renovación real la hace el timer de arriba.
sudo certbot certificates --cert-name "$DOMAIN"
echo "HTTPS listo en https://$DOMAIN"
