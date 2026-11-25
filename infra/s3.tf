# ---------------------------------------------------------------------------
# S3: fotos de perfil (flujo 3)
# La app sube cada foto con una key perfiles/<usuarioId>/<uuid>.<ext> y guarda la
# key en MongoDB. El bucket es privado: las imágenes se leen con URLs prefirmadas
# de 10 minutos que genera la ruta GET /media/perfiles/... del backend.
# La EC2 accede con el rol LabRole (LabInstanceProfile), sin llaves en el código.
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "perfiles" {
  # Los nombres de bucket son globales: el prefijo + sufijo aleatorio evita choques
  # entre los laboratorios de cada integrante.
  bucket_prefix = "${var.project_name}-perfiles-"

  # Permite que terraform destroy borre el bucket aunque tenga fotos.
  force_destroy = true

  tags = {
    Name = "${var.project_name}-perfiles"
  }
}

# Bloquea cualquier acceso público (ACLs o políticas públicas), aunque alguien
# lo intente por error desde la consola.
resource "aws_s3_bucket_public_access_block" "perfiles" {
  bucket = aws_s3_bucket.perfiles.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Desactiva las ACLs: el dueño del bucket es dueño de todos los objetos y el
# acceso se controla solo con IAM (LabRole) y URLs prefirmadas.
resource "aws_s3_bucket_ownership_controls" "perfiles" {
  bucket = aws_s3_bucket.perfiles.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# Cifrado en reposo por defecto con llaves administradas por S3 (SSE-S3, sin costo extra).
resource "aws_s3_bucket_server_side_encryption_configuration" "perfiles" {
  bucket = aws_s3_bucket.perfiles.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Limpia subidas multiparte que quedaron a medias (no se ven en la consola pero cuestan).
resource "aws_s3_bucket_lifecycle_configuration" "perfiles" {
  bucket = aws_s3_bucket.perfiles.id

  rule {
    id     = "abortar-subidas-incompletas"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# Sin CORS a propósito: el navegador nunca habla con S3 por fetch/XHR.
# Las fotos se suben al backend (multer) y se muestran con <img>, que sigue la
# redirección a la URL prefirmada sin necesitar CORS.
