# ---------------------------------------------------------------------------
# Lambda notificarMatch: recibe el evento de SNS y manda el correo de match.
# El código se compila antes de terraform con `npm run build:lambda` en BACKEND
# (los workflows Deploy infra y Destroy infra lo hacen automáticamente).
# ---------------------------------------------------------------------------

locals {
  lambda_name = "${var.project_name}-notificar-match"
}

# Empaqueta el bundle de esbuild en un zip para subirlo a Lambda.
data "archive_file" "notificar_match" {
  type        = "zip"
  source_file = "${path.module}/../BACKEND/dist-lambda/notificarMatch.js"
  output_path = "${path.module}/build/notificarMatch.zip"
}

# Se crea el grupo de logs con retención para que terraform destroy también lo borre.
resource "aws_cloudwatch_log_group" "notificar_match" {
  name              = "/aws/lambda/${local.lambda_name}"
  retention_in_days = 14
}

resource "aws_lambda_function" "notificar_match" {
  function_name    = local.lambda_name
  description      = "Envia el correo de match a los dos usuarios"
  role             = data.aws_iam_role.lab.arn # Learner Lab no permite crear roles
  runtime          = "nodejs22.x"
  handler          = "notificarMatch.handler"
  filename         = data.archive_file.notificar_match.output_path
  source_code_hash = data.archive_file.notificar_match.output_base64sha256
  timeout          = 30
  memory_size      = 256

  # Fuera de VPC: necesita internet para el SMTP de Gmail.
  environment {
    variables = {
      EMAIL_USER = lookup(var.app_env, "EMAIL_USER", "")
      EMAIL_PASS = lookup(var.app_env, "EMAIL_PASS", "")
      APP_URL    = local.app_url
    }
  }

  depends_on = [aws_cloudwatch_log_group.notificar_match]
}

# Suscribe la Lambda al topic de matches.
resource "aws_sns_topic_subscription" "notificar_match" {
  topic_arn = aws_sns_topic.matches.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.notificar_match.arn
}

# Permite que SNS invoque la Lambda.
resource "aws_lambda_permission" "sns_notificar_match" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.notificar_match.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.matches.arn
}
