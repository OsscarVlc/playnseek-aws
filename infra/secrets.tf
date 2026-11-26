# Las variables de entorno de la app se guardan en Secrets Manager.
# EC2 las descarga en el arranque y escribe BACKEND/.env, así ninguna
# credencial queda en el repositorio ni en el user_data.

locals {
  # Dominio gratuito que resuelve a la Elastic IP (34.197.94.85 -> 34-197-94-85.sslip.io).
  # Let's Encrypt no emite certificados para IPs sueltas, por eso se necesita un nombre.
  public_domain = "${replace(aws_eip.app.public_ip, ".", "-")}.sslip.io"

  # URL pública con HTTPS (la usan los enlaces de los correos y la Lambda de match).
  app_url = coalesce(var.app_url, "https://${local.public_domain}")

  # Valores calculados por Terraform; se combinan con los de terraform.tfvars.
  app_env = merge(var.app_env, {
    APP_URL        = local.app_url
    DGRAPH_ADDRESS = "localhost:9080"
    PORT           = "3000"
    SNS_TOPIC_ARN  = aws_sns_topic.matches.arn
    S3_BUCKET      = local.bucket_perfiles
    AWS_REGION     = var.aws_region
  })
}

resource "aws_secretsmanager_secret" "app_env" {
  name        = "${var.project_name}/app-env"
  description = "Variables de entorno de PlayNSeek"

  # 0 días: permite destruir y volver a crear el secreto con el mismo nombre.
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "app_env" {
  secret_id     = aws_secretsmanager_secret.app_env.id
  secret_string = jsonencode(local.app_env)
}
