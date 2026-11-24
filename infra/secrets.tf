# Las variables de entorno de la app se guardan en Secrets Manager.
# EC2 las descarga en el arranque y escribe BACKEND/.env, así ninguna
# credencial queda en el repositorio ni en el user_data.

locals {
  app_url = coalesce(var.app_url, "http://${aws_eip.app.public_ip}")

  # Valores calculados por Terraform; se combinan con los de terraform.tfvars.
  app_env = merge(var.app_env, {
    APP_URL        = local.app_url
    DGRAPH_ADDRESS = "localhost:9080"
    PORT           = "3000"
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
