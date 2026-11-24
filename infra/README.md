# Infraestructura con Terraform

Con un solo `terraform apply` se crea todo lo necesario para correr PlayNSeek en el
AWS Learner Lab y la aplicación queda funcionando, sin pasos manuales dentro de EC2.

## Qué se crea

| Recurso | Archivo | Para qué |
|---|---|---|
| Security group | `ec2.tf` | HTTP, HTTPS y SSH (CI/CD) |
| Elastic IP | `ec2.tf` | IP fija para Atlas, Nginx y GitHub Actions |
| EC2 t3.medium (AL2023) | `ec2.tf` | App, Nginx y Dgraph en Docker |
| Volumen EBS gp3 20 GiB | `ec2.tf` | Datos de Dgraph separados del disco del sistema |
| Secreto | `secrets.tf` | Variables de `BACKEND/.env` en Secrets Manager |

`user_data.sh.tftpl` se ejecuta en el primer arranque y reutiliza los scripts de
`scripts/`: instala dependencias, formatea el volumen solo si está vacío, lo monta,
escribe `.env` desde Secrets Manager, compila y levanta Dgraph, el backend y Nginx.

Como Learner Lab no permite crear roles, se usan `LabInstanceProfile` y `LabRole`.

## Requisitos

- Learner Lab iniciado (las credenciales caducan cada 4 horas).
- AWS CloudShell, o Terraform 1.6+ y AWS CLI con las credenciales del laboratorio.

En CloudShell se instala Terraform así:

```bash
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://rpm.releases.hashicorp.com/AmazonLinux/hashicorp.repo
sudo dnf install -y terraform
```

## Desplegar

```bash
git clone https://github.com/OsscarVlc/playnseek-aws.git
cd playnseek-aws/infra
cp terraform.tfvars.example terraform.tfvars   # completar credenciales
terraform init
terraform apply
```

Al terminar se muestran `app_url`, `public_ip` y `ssh_command`. La instancia tarda
de 5 a 8 minutos en instalar todo; el avance se ve con:

```bash
ssh -i labsuser.pem ec2-user@<public_ip> 'sudo tail -f /var/log/playnseek-setup.log'
```

Después del primer `apply`:

1. Agregar `public_ip/32` a la lista de acceso de MongoDB Atlas.
2. Actualizar los secretos de GitHub `EC2_HOST` (public_ip) y `EC2_SSH_KEY` (labsuser.pem).

## Respaldos y restauración

```bash
bash scripts/snapshot-data-volume.sh          # crea un snapshot del volumen de Dgraph
```

Para restaurar en un despliegue nuevo, poner el ID en `terraform.tfvars`
(`data_snapshot_id = "snap-..."`) antes de `terraform apply`. Un volumen restaurado
ya tiene sistema de archivos, así que el arranque no lo formatea.

## Destruir

```bash
bash scripts/snapshot-data-volume.sh   # opcional, para conservar los datos
terraform destroy
```

## Agregar recursos

Cada integrante agrega su propio archivo en esta carpeta (`s3.tf`, `sns.tf`,
`lambda.tf`, `cloudwatch.tf`). Se pueden reutilizar `data.aws_iam_role.lab`,
`aws_instance.app` y `var.project_name`. Si la app necesita una variable nueva
(por ejemplo el nombre del bucket), se agrega en `local.app_env` de `secrets.tf`.
