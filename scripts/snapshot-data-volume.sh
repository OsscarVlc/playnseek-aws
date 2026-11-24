#!/usr/bin/env bash
# Crea un snapshot del volumen EBS de Dgraph.
# Uso (CloudShell o cualquier equipo con credenciales del Learner Lab):
#   bash scripts/snapshot-data-volume.sh
# El ID resultante se puede usar en infra/terraform.tfvars (data_snapshot_id)
# para restaurar los datos en un despliegue nuevo.
set -euo pipefail

export AWS_PAGER=""
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-playnseek}"
VOLUME_NAME="${PROJECT_NAME}-dgraph-data"

VOLUME_ID=$(aws ec2 describe-volumes \
  --region "$AWS_REGION" \
  --filters "Name=tag:Name,Values=$VOLUME_NAME" \
  --query "Volumes[0].VolumeId" \
  --output text)

if [[ -z "$VOLUME_ID" || "$VOLUME_ID" == "None" ]]; then
  echo "No se encontró el volumen $VOLUME_NAME." >&2
  exit 1
fi

SNAPSHOT_ID=$(aws ec2 create-snapshot \
  --region "$AWS_REGION" \
  --volume-id "$VOLUME_ID" \
  --description "Respaldo de Dgraph $(date -u +%Y-%m-%dT%H:%MZ)" \
  --tag-specifications \
    "ResourceType=snapshot,Tags=[{Key=Name,Value=$VOLUME_NAME-backup},{Key=Project,Value=$PROJECT_NAME}]" \
  --query "SnapshotId" \
  --output text)

echo "Snapshot iniciado: $SNAPSHOT_ID (volumen $VOLUME_ID)"

aws ec2 wait snapshot-completed \
  --region "$AWS_REGION" \
  --snapshot-ids "$SNAPSHOT_ID"

echo "Snapshot completado: $SNAPSHOT_ID"
