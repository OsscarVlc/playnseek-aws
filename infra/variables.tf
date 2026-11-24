variable "aws_region" {
  description = "Región de AWS del Learner Lab"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefijo para nombrar los recursos"
  type        = string
  default     = "playnseek"
}

variable "instance_type" {
  description = "Tipo de instancia EC2"
  type        = string
  default     = "t3.medium"
}

variable "key_name" {
  description = "Par de llaves para SSH. En Learner Lab existe 'vockey' (labsuser.pem)"
  type        = string
  default     = "vockey"
}

variable "ssh_cidr" {
  description = "Rango con acceso SSH. GitHub Actions no tiene IP fija, por eso el valor por defecto es abierto"
  type        = string
  default     = "0.0.0.0/0"
}

variable "repo_url" {
  description = "Repositorio que se clona dentro de EC2"
  type        = string
  default     = "https://github.com/OsscarVlc/playnseek-aws.git"
}

variable "repo_branch" {
  description = "Rama que se despliega en el primer arranque"
  type        = string
  default     = "main"
}

variable "data_volume_size" {
  description = "Tamaño en GiB del volumen EBS de Dgraph"
  type        = number
  default     = 20
}

variable "data_snapshot_id" {
  description = "Snapshot opcional para restaurar los datos de Dgraph. null = volumen nuevo"
  type        = string
  default     = null
}

variable "app_url" {
  description = "URL pública de la app. null = http://<Elastic IP>. Cambiar al configurar HTTPS"
  type        = string
  default     = null
}

variable "app_env" {
  description = "Variables secretas de BACKEND/.env (MONGODB_URI, JWT_SECRET, EMAIL_USER, ...)"
  type        = map(string)
  sensitive   = true
}
