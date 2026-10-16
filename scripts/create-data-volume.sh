#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/aws-config.sh"
export AWS_PAGER=""

INSTANCE_ID="${1:?Debes indicar el ID de la instancia}"
VOLUME_NAME="${PROJECT_NAME}-dgraph-data"

# Obtener la zona de la instancia.
ZONE=$(aws ec2 describe-instances \
  --region "$AWS_REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query "Reservations[0].Instances[0].Placement.AvailabilityZone" \
  --output text)

if [[ -z "$ZONE" || "$ZONE" == "None" ]]; then
  echo "No se encontró la zona de la instancia." >&2
  exit 1
fi

# Evitar crear otro volumen si ya existe uno con este nombre.
EXISTING_ID=$(aws ec2 describe-volumes \
  --region "$AWS_REGION" \
  --filters "Name=tag:Name,Values=$VOLUME_NAME" \
            "Name=availability-zone,Values=$ZONE" \
  --query "Volumes[].VolumeId" \
  --output text)

if [[ -n "$EXISTING_ID" && "$EXISTING_ID" != "None" ]]; then
  echo "Ya existe un volumen: $EXISTING_ID"
  exit 0
fi

VOLUME_ID=$(aws ec2 create-volume \
  --region "$AWS_REGION" \
  --availability-zone "$ZONE" \
  --size 20 \
  --volume-type gp3 \
  --encrypted \
  --tag-specifications \
    "ResourceType=volume,Tags=[{Key=Name,Value=$VOLUME_NAME},{Key=Project,Value=$PROJECT_NAME}]" \
  --query "VolumeId" \
  --output text)

echo "Volumen creado: $VOLUME_ID"

aws ec2 wait volume-available \
  --region "$AWS_REGION" \
  --volume-ids "$VOLUME_ID"

echo "Volumen disponible para conectar."