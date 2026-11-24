output "app_url" {
  description = "URL pública de la aplicación"
  value       = local.app_url
}

output "public_ip" {
  description = "Elastic IP (agregarla a MongoDB Atlas y al secreto EC2_HOST de GitHub)"
  value       = aws_eip.app.public_ip
}

output "instance_id" {
  description = "ID de la instancia EC2"
  value       = aws_instance.app.id
}

output "data_volume_id" {
  description = "Volumen EBS con los datos de Dgraph"
  value       = aws_ebs_volume.dgraph_data.id
}

output "secret_name" {
  description = "Secreto con las variables de entorno"
  value       = aws_secretsmanager_secret.app_env.name
}

output "ssh_command" {
  description = "Conexión SSH (llave labsuser.pem del Learner Lab)"
  value       = "ssh -i labsuser.pem ec2-user@${aws_eip.app.public_ip}"
}
