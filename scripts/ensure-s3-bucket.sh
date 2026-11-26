#!/usr/bin/env bash
# Crea (o elimina) el bucket privado de fotos de perfil con AWS CLI.
#
# Por qué no con Terraform: el provider de AWS, al leer un aws_s3_bucket, siempre
# llama a s3:GetBucketObjectLockConfiguration, y la política de AWS Academy
# (Learner Lab) niega esa acción de forma explícita. El bucket se crea, pero
# Terraform falla al leerlo. Con AWS CLI solo hacemos las llamadas permitidas.
#
# Uso:
#   bash scripts/ensure-s3-bucket.sh            # crea y configura (idempotente)
#   bash scripts/ensure-s3-bucket.sh --delete   # borra el bucket y su contenido
#
# El nombre es fijo por cuenta: <proyecto>-perfiles-<id de cuenta>. Terraform
# calcula el mismo nombre en infra/s3.tf para pasárselo a la app (S3_BUCKET).
set -euo pipefail

export AWS_PAGER=""
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-playnseek}"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="${PROJECT_NAME}-perfiles-${ACCOUNT_ID}"

existe_bucket() {
  aws s3api head-bucket --bucket "$BUCKET" > /dev/null 2>&1
}

# ---------------------------------------------------------------------------
# Modo --delete: lo usa Destroy infra después de terraform destroy
# ---------------------------------------------------------------------------
if [[ "${1:-}" == "--delete" ]]; then
  if existe_bucket; then
    aws s3 rb "s3://$BUCKET" --force
    echo "Bucket $BUCKET eliminado"
  else
    echo "El bucket $BUCKET no existe; nada que borrar"
  fi
  exit 0
fi

# ---------------------------------------------------------------------------
# Crear el bucket si no existe (en us-east-1 no lleva LocationConstraint)
# ---------------------------------------------------------------------------
if existe_bucket; then
  echo "El bucket $BUCKET ya existe"
else
  if [[ "$AWS_REGION" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$BUCKET" --region "$AWS_REGION"
  else
    aws s3api create-bucket --bucket "$BUCKET" --region "$AWS_REGION" \
      --create-bucket-configuration "LocationConstraint=$AWS_REGION"
  fi
  aws s3api wait bucket-exists --bucket "$BUCKET"
  echo "Bucket $BUCKET creado"
fi

# Configuración: si alguna acción también estuviera bloqueada por el laboratorio,
# se avisa y se continúa; el bucket sigue siendo privado por defecto.
configurar() {
  local descripcion="$1"
  shift
  if "$@" > /dev/null 2>&1; then
    echo "OK: $descripcion"
  else
    echo "Aviso: no se pudo aplicar '$descripcion' (¿restricción del laboratorio?)"
  fi
}

# Bloquea cualquier acceso público (ACLs o políticas públicas).
configurar "bloqueo de acceso público" \
  aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Sin ACLs: el acceso se controla solo con IAM (LabRole) y URLs prefirmadas.
configurar "ownership BucketOwnerEnforced" \
  aws s3api put-bucket-ownership-controls --bucket "$BUCKET" \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'

# Cifrado en reposo con llaves administradas por S3 (SSE-S3).
configurar "cifrado SSE-S3" \
  aws s3api put-bucket-encryption --bucket "$BUCKET" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Limpia subidas multiparte que quedaron a medias.
configurar "limpieza de subidas incompletas" \
  aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" \
  --lifecycle-configuration \
  '{"Rules":[{"ID":"abortar-subidas-incompletas","Status":"Enabled","Filter":{},"AbortIncompleteMultipartUpload":{"DaysAfterInitiation":1}}]}'

configurar "etiquetas" \
  aws s3api put-bucket-tagging --bucket "$BUCKET" \
  --tagging "TagSet=[{Key=Project,Value=$PROJECT_NAME},{Key=Name,Value=$PROJECT_NAME-perfiles}]"

echo "Bucket listo: $BUCKET"
