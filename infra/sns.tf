# ---------------------------------------------------------------------------
# SNS: eventos de match (flujo 2)
# La app publica "match_creado" cuando dos usuarios hacen match.
# La Lambda notificarMatch está suscrita y manda los correos (lambda.tf).
# Separar publicación y entrega permite agregar más suscriptores sin tocar la app.
# ---------------------------------------------------------------------------
resource "aws_sns_topic" "matches" {
  name = "${var.project_name}-matches"

  tags = {
    Name = "${var.project_name}-matches"
  }
}
