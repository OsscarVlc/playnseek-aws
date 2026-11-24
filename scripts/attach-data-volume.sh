#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/aws-config.sh"
export AWS_PAGER=""

INSTANCE_ID="${1:?Indica el ID de la instancia}"
VOLUME_ID="${2:?Indica el ID del volumen}"

ATTACHED_INSTANCE=$(aws ec2 describe-volumes \
  --region "$AWS_REGION" \
  --volume-ids "$VOLUME_ID" \
  --query "Volumes[0].Attachments[0].InstanceId" \
  --output text)

if [[ "$ATTACHED_INSTANCE" == "$INSTANCE_ID" ]]; then
  echo "El volumen ya está conectado a esta instancia."
  exit 0
fi

if [[ -n "$ATTACHED_INSTANCE" && "$ATTACHED_INSTANCE" != "None" ]]; then
  echo "Error: el volumen está conectado a otra instancia." >&2
  exit 1
fi

aws ec2 wait volume-available \
  --region "$AWS_REGION" \
  --volume-ids "$VOLUME_ID"

aws ec2 attach-volume \
  --region "$AWS_REGION" \
  --volume-id "$VOLUME_ID" \
  --instance-id "$INSTANCE_ID" \
  --device /dev/sdf

aws ec2 wait volume-in-use \
  --region "$AWS_REGION" \
  --volume-ids "$VOLUME_ID"

echo "Volumen conectado."