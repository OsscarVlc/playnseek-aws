output "app_url" {
  description = "URL pública de la aplicación"
  value       = local.app_url
}

output "public_domain" {
  description = "Dominio sslip.io con certificado de Let's Encrypt"
  value       = local.public_domain
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

output "sns_topic_matches" {
  description = "Topic de SNS donde la app publica los matches"
  value       = aws_sns_topic.matches.arn
}

output "lambda_notificar_match" {
  description = "Lambda que manda los correos de match"
  value       = aws_lambda_function.notificar_match.function_name
}

output "s3_bucket_perfiles" {
  description = "Bucket privado con las fotos de perfil"
  value       = local.bucket_perfiles
}
