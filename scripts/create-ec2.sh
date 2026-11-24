#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/aws-config.sh"
export AWS_PAGER=""

INSTANCE_NAME="${PROJECT_NAME}-server"

# Evitar crear otra instancia si ya existe una activa o detenida
EXISTING_ID=$(aws ec2 describe-instances \
  --region "$AWS_REGION" \
  --filters "Name=tag:Name,Values=$INSTANCE_NAME" \
            "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query "Reservations[].Instances[].InstanceId" \
  --output text)

if [[ -n "$EXISTING_ID" && "$EXISTING_ID" != "None" ]]; then
  echo "Ya existe una instancia: $EXISTING_ID"
  exit 0
fi

# Consultar el nombre del disco raíz de la imagen
ROOT_DEVICE=$(aws ec2 describe-images \
  --region "$AWS_REGION" \
  --image-ids "$AMI_ID" \
  --query "Images[0].RootDeviceName" \
  --output text)

if [[ -z "$ROOT_DEVICE" || "$ROOT_DEVICE" == "None" ]]; then
  echo "No se pudo obtener el disco raíz de la imagen." >&2
  exit 1
fi

# Crear una instancia con 30 GiB de almacenamiento
INSTANCE_ID=$(aws ec2 run-instances \
  --region "$AWS_REGION" \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --count 1 \
  --subnet-id "$SUBNET_ID" \
  --security-group-ids "$SECURITY_GROUP_ID" \
  --associate-public-ip-address \
  --iam-instance-profile "Name=$INSTANCE_PROFILE" \
  --metadata-options "HttpTokens=required,HttpEndpoint=enabled" \
  --credit-specification "CpuCredits=standard" \
  --block-device-mappings \
    "[{\"DeviceName\":\"$ROOT_DEVICE\",\"Ebs\":{\"VolumeSize\":30,\"VolumeType\":\"gp3\",\"Encrypted\":true,\"DeleteOnTermination\":true}}]" \
  --tag-specifications \
    "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME},{Key=Project,Value=$PROJECT_NAME}]" \
    "ResourceType=volume,Tags=[{Key=Project,Value=$PROJECT_NAME}]" \
  --query "Instances[0].InstanceId" \
  --output text)

echo "Instancia creada: $INSTANCE_ID"