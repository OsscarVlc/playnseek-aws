#!/usr/bin/env bash
# Vuelve a escribir BACKEND/.env con el valor actual del secreto en Secrets Manager.
# Lo usa el pipeline de despliegue para que un cambio en APP_ENV_JSON
# (aplicado con Deploy infra) llegue a la app sin recrear la instancia.
# Uso dentro de EC2: bash scripts/refresh-env.sh [nombre-del-secreto]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$(dirname "$SCRIPT_DIR")/BACKEND/.env"
SECRET_ID="${1:-playnseek/app-env}"
AWS_REGION="${AWS_REGION:-us-east-1}"

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

aws secretsmanager get-secret-value \
  --region "$AWS_REGION" \
  --secret-id "$SECRET_ID" \
  --query SecretString --output text \
  | python3 -c 'import json,sys; [print(f"{k}={v}") for k,v in json.load(sys.stdin).items()]' \
  > "$TMP_FILE"

# Solo se reemplaza si el secreto se leyó bien y no está vacío.
test -s "$TMP_FILE"
install -m 600 "$TMP_FILE" "$ENV_FILE"

echo ".env actualizado desde $SECRET_ID"
