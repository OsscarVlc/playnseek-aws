#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/aws-config.sh"
export AWS_PAGER=""

GROUP_NAME="${PROJECT_NAME}-web-sg"

# Reutilizar el grupo si ya existe
SG_ID=$(aws ec2 describe-security-groups \
  --region "$AWS_REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" \
            "Name=group-name,Values=$GROUP_NAME" \
  --query "SecurityGroups[0].GroupId" \
  --output text)

if [[ "$SG_ID" == "None" || -z "$SG_ID" ]]; then
  SG_ID=$(aws ec2 create-security-group \
    --region "$AWS_REGION" \
    --group-name "$GROUP_NAME" \
    --description "Acceso web a PlayNSeek" \
    --vpc-id "$VPC_ID" \
    --query "GroupId" \
    --output text)
fi

# Agregar HTTP. Si la regla ya existe, continuar.
if RESULT=$(aws ec2 authorize-security-group-ingress \
  --region "$AWS_REGION" \
  --group-id "$SG_ID" \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 2>&1); then
  echo "Acceso HTTP configurado."
elif [[ "$RESULT" == *"InvalidPermission.Duplicate"* ]]; then
  echo "La regla HTTP ya existe."
else
  printf '%s\n' "$RESULT" >&2
  exit 1
fi

echo "Grupo de seguridad: $SG_ID"