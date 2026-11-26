# ---------------------------------------------------------------------------
# S3: fotos de perfil (flujo 3)
# La app sube cada foto con una key perfiles/<usuarioId>/<uuid>.<ext> y guarda la
# key en MongoDB. El bucket es privado: las imágenes se leen con URLs prefirmadas
# de 10 minutos que genera la ruta GET /media/perfiles/... del backend.
# La EC2 accede con el rol LabRole (LabInstanceProfile), sin llaves en el código.
#
# El bucket NO se administra con un recurso aws_s3_bucket: al leerlo, el provider
# de AWS siempre llama a s3:GetBucketObjectLockConfiguration y la política de
# AWS Academy (Learner Lab) niega esa acción, así que el apply falla.
# Lo crea y configura scripts/ensure-s3-bucket.sh (AWS CLI), que corre en el
# workflow Deploy infra antes de Terraform, y lo borra Destroy infra al final.
# Aquí solo se calcula el mismo nombre para pasárselo a la app.
# ---------------------------------------------------------------------------

data "aws_caller_identity" "current" {}

locals {
  # Nombre fijo por cuenta: no choca entre los laboratorios de cada integrante.
  bucket_perfiles = "${var.project_name}-perfiles-${data.aws_caller_identity.current.account_id}"
}
