# Configuración base de Terraform para PlayNSeek en AWS Learner Lab.
# Los demás archivos (.tf) de esta carpeta se combinan automáticamente:
#   ec2.tf        red, instancia, Elastic IP y volumen EBS de Dgraph
#   secrets.tf    variables de entorno de la app en Secrets Manager
#   s3.tf         (Sofía)  bucket de fotos de perfil
#   sns.tf        (Sergio) notificaciones de match
#   lambda.tf     (Sergio) función que consume SNS
#   cloudwatch.tf (Sergio) métricas, alarmas y dashboard

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  # Todos los recursos quedan etiquetadas para identificarlas en la consola.
  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
    }
  }
}

# ---------------------------------------------------------------------------
# Datos existentes del Learner Lab (no se crean, solo se consultan)
# ---------------------------------------------------------------------------

# Learner Lab no permite crear roles de IAM, así que usamos los que ya existen.
data "aws_iam_instance_profile" "lab" {
  name = "LabInstanceProfile"
}

data "aws_iam_role" "lab" {
  name = "LabRole" # lo usará lambda.tf
}

# VPC y subred por defecto de la cuenta: evita escribir IDs fijos.
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }

  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

# Se fija la primera subred para que EC2 y el volumen EBS queden en la misma zona.
data "aws_subnet" "app" {
  id = sort(data.aws_subnets.default.ids)[0]
}

# Amazon Linux 2023 más reciente (la misma familia que usamos en la Fase 2).
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}
