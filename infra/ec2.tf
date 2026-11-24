# ---------------------------------------------------------------------------
# Security group: HTTP/HTTPS para todos y SSH para el despliegue de CI/CD
# ---------------------------------------------------------------------------
resource "aws_security_group" "web" {
  name        = "${var.project_name}-web-sg"
  description = "Acceso web a PlayNSeek"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH para GitHub Actions"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr]
  }

  egress {
    description = "Salida a internet (Atlas, Docker Hub, npm, GitHub)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ---------------------------------------------------------------------------
# Elastic IP: la IP pública ya no cambia al detener o reiniciar la instancia.
# Se crea antes que la instancia para poder pasarla al user_data (APP_URL, Nginx).
# ---------------------------------------------------------------------------
resource "aws_eip" "app" {
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-eip"
  }
}

# ---------------------------------------------------------------------------
# Volumen EBS para los datos de Dgraph (separado del disco del sistema)
# ---------------------------------------------------------------------------
resource "aws_ebs_volume" "dgraph_data" {
  availability_zone = data.aws_subnet.app.availability_zone
  size              = var.data_volume_size
  type              = "gp3"
  encrypted         = true
  snapshot_id       = var.data_snapshot_id

  tags = {
    Name = "${var.project_name}-dgraph-data"
  }
}

# ---------------------------------------------------------------------------
# Instancia EC2 con la app, Nginx y Dgraph
# ---------------------------------------------------------------------------
resource "aws_instance" "app" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnet.app.id
  vpc_security_group_ids = [aws_security_group.web.id]
  iam_instance_profile   = data.aws_iam_instance_profile.lab.name
  key_name               = var.key_name

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required" # IMDSv2
  }

  credit_specification {
    cpu_credits = "standard"
  }

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  # Script de primer arranque: instala, monta EBS, escribe .env y levanta servicios.
  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    aws_region  = var.aws_region
    repo_url    = var.repo_url
    repo_branch = var.repo_branch
    secret_id   = aws_secretsmanager_secret.app_env.id
    volume_id   = aws_ebs_volume.dgraph_data.id
    public_host = aws_eip.app.public_ip
  })

  # Si cambia el script, se recrea la instancia (el volumen de datos se conserva).
  user_data_replace_on_change = true

  # El secreto debe tener valor antes de que la instancia lo lea.
  depends_on = [aws_secretsmanager_secret_version.app_env]

  tags = {
    Name = "${var.project_name}-server"
  }
}

resource "aws_volume_attachment" "dgraph_data" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.dgraph_data.id
  instance_id = aws_instance.app.id

  # Detener la instancia antes de desconectar evita corromper los datos al destruir.
  stop_instance_before_detaching = true
}

resource "aws_eip_association" "app" {
  allocation_id = aws_eip.app.id
  instance_id   = aws_instance.app.id
}
