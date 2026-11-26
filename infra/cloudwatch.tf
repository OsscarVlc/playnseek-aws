# GitHub Actions recibe el correo desde el secreto ALERT_EMAIL.
# En el laboratorio personal se puede pasar con TF_VAR_alert_email.
variable "alert_email" {
  description = "Correo que recibirá las alertas de monitoreo de PlayNSeek."
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.alert_email))
    error_message = "Indica un correo válido para las alertas."
  }
}

# Las dos alarmas de CloudWatch publicarán sus avisos en este tema.
resource "aws_sns_topic" "alertas_monitoreo" {
  name = "${var.project_name}-alertas-monitoreo"
}

# Al aplicar la infraestructura, AWS enviará un correo de confirmación.
# El destinatario debe confirmar la suscripción para recibir las alertas.
resource "aws_sns_topic_subscription" "correo_monitoreo" {
  topic_arn = aws_sns_topic.alertas_monitoreo.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "errores_lambda" {
  alarm_name          = "${var.project_name}-errores-lambda"
  alarm_description   = "La Lambda de notificaciones tuvo al menos un error en 5 minutos."
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  # Vigila solo la Lambda de PlayNSeek, no todas las de la cuenta.
  dimensions = {
    FunctionName = aws_lambda_function.notificar_match.function_name
  }

  alarm_actions = [aws_sns_topic.alertas_monitoreo.arn]
}

resource "aws_cloudwatch_metric_alarm" "disco_dgraph_alto" {
  alarm_name          = "${var.project_name}-disco-dgraph-alto"
  alarm_description   = "El volumen de Dgraph supera el 85 % de uso durante dos minutos consecutivos."
  namespace           = "CWAgent"
  metric_name         = "disk_used_percent"
  statistic           = "Average"
  period              = 60
  evaluation_periods  = 2
  threshold           = 85
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "missing"

  # El agente deberá publicar la métrica con estas mismas dimensiones.
  dimensions = {
    InstanceId = aws_instance.app.id
    path       = "/data/dgraph"
    fstype     = "xfs"
  }

  alarm_actions = [aws_sns_topic.alertas_monitoreo.arn]
}

# Configuración que usará CloudWatch Agent en la EC2 de PlayNSeek.
# jsonencode convierte este bloque de Terraform al JSON que espera el agente.
locals {
  cloudwatch_agent_config = jsonencode({
    agent = {
      metrics_collection_interval = 60
    }

    metrics = {
      namespace = "CWAgent"

      # El agente obtiene el ID de la instancia donde está corriendo.
      append_dimensions = {
        InstanceId = "$${aws:InstanceId}"
      }

      metrics_collected = {
        mem = {
          measurement = ["used_percent"]
        }

        disk = {
          measurement = ["used_percent"]
          resources   = ["/data/dgraph"]
          drop_device = true
        }
        # El backend envía sus contadores al agente en la misma EC2.
        statsd = {
          service_address              = "127.0.0.1:8125"
          metrics_collection_interval  = 60
          metrics_aggregation_interval = 60
        }
      }
    }
  })
}

# Instala y configura el agente en la EC2 existente de PlayNSeek.
resource "aws_ssm_association" "cloudwatch_agent" {
  name             = "AWS-RunShellScript"
  association_name = "${var.project_name}-cloudwatch-agent"

  # Vuelve a correr los comandos cada 30 minutos. Si la primera ejecución falla
  # (por ejemplo, porque el user_data de una EC2 nueva sigue usando dnf), el agente
  # se instala en el siguiente intento. Los comandos son idempotentes.
  schedule_expression = "rate(30 minutes)"

  targets {
    key    = "InstanceIds"
    values = [aws_instance.app.id]
  }

  parameters = {
    commands = <<-SCRIPT
      set -eu

      # Amazon Linux 2023 incluye el agente en sus repositorios.
      dnf install -y amazon-cloudwatch-agent

      # Copiamos el JSON de Terraform sin que la shell interprete su contenido.
      config=/opt/aws/amazon-cloudwatch-agent/etc/playnseek.json
      echo '${base64encode(local.cloudwatch_agent_config)}' | base64 --decode > "$config"

      # Cargamos esa configuración y arrancamos el agente en modo EC2.
      /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
        -a fetch-config -m ec2 -c "file:$config" -s
    SCRIPT
  }
}

resource "aws_cloudwatch_dashboard" "monitoreo" {
  dashboard_name = "${var.project_name}-monitoreo"

  dashboard_body = jsonencode({
    start = "-PT3H" # Mostrar las últimas tres horas.

    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          title  = "EC2: CPU, memoria y disco de Dgraph (%)"
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Average"
          period = 300
          yAxis  = { left = { min = 0, max = 100 } }

          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", aws_instance.app.id, { label = "CPU" }],
            ["CWAgent", "mem_used_percent", "InstanceId", aws_instance.app.id, { label = "Memoria" }],
            ["CWAgent", "disk_used_percent", "InstanceId", aws_instance.app.id, "path", "/data/dgraph", "fstype", "xfs", { label = "Disco Dgraph" }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          title  = "Lambda: errores de notificación por cada 5 minutos"
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Sum"
          period = 300

          metrics = [
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.notificar_match.function_name]
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 24
        height = 6

        properties = {
          title  = "PlayNSeek: matches creados y fallos de sincronización por cada 5 minutos"
          region = var.aws_region
          view   = "timeSeries"
          period = 300

          metrics = [
            [
              "CWAgent", "MatchesCreados",
              "InstanceId", aws_instance.app.id,
              "metric_type", "counter",
              { label = "Matches creados", stat = "Sum", period = 300 }
            ],
            [
              "CWAgent", "FallosSyncUsuarioDgraph",
              "InstanceId", aws_instance.app.id,
              "metric_type", "counter",
              { label = "Fallos de sincronización de usuario con Dgraph", stat = "Sum", period = 300 }
            ]
          ]
        }
      }
    ]
  })
}