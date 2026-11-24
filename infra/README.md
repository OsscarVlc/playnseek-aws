# Infraestructura con Terraform

Con un solo `terraform apply` se crea todo lo necesario para correr PlayNSeek en el
AWS Learner Lab y la aplicación queda funcionando, sin pasos manuales dentro de EC2.
El apply y el destroy se lanzan desde GitHub Actions y el state se guarda en
HCP Terraform.

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

## Dónde vive el state

El bloque `cloud` de `main.tf` guarda el state en HCP Terraform:

- Organización: `oscar-vlc-iteso`
- Workspace: `playnseek-aws`, con **Execution Mode: Local**

Con Execution Mode Local, Terraform se ejecuta en GitHub Actions (o en CloudShell)
con las credenciales del Learner Lab, y HCP solo guarda el state. Así cualquier
integrante puede aplicar cambios sin depender de la máquina de otro.

## Secretos de GitHub

| Secreto | Valor | ¿Cambia? |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | Learner Lab → AWS Details | Cada vez que se inicia el lab |
| `AWS_SECRET_ACCESS_KEY` | Learner Lab → AWS Details | Cada vez que se inicia el lab |
| `AWS_SESSION_TOKEN` | Learner Lab → AWS Details | Cada vez que se inicia el lab |
| `TF_API_TOKEN` | Token de usuario de HCP Terraform | No |
| `APP_ENV_JSON` | Variables de `BACKEND/.env` en JSON | Solo si cambian |
| `EC2_HOST` | Elastic IP (output `public_ip`) | Solo si se recrea la IP |
| `EC2_SSH_KEY` | Contenido de `labsuser.pem` | No |

Ejemplo de `APP_ENV_JSON` (APP_URL, DGRAPH_ADDRESS y PORT los calcula Terraform):

```json
{"MONGODB_URI":"mongodb+srv://...","JWT_SECRET":"...","RAWG_KEY":"...","EMAIL_USER":"...","EMAIL_PASS":"...","CLOUDINARY_CLOUD_NAME":"...","CLOUDINARY_API_KEY":"...","CLOUDINARY_API_SECRET":"..."}
```

## Crear o actualizar la infraestructura

1. Iniciar el Learner Lab y actualizar los 3 secretos de AWS.
2. **Actions → Deploy infra → Run workflow.**
3. El resumen del workflow muestra la URL y la Elastic IP. Si la IP cambió,
   actualizar `EC2_HOST` y agregarla en MongoDB Atlas.
4. Si la EC2 es nueva, esperar de 5 a 10 minutos a que el `user_data` instale todo.

Cuando alguien agrega un `.tf` (por ejemplo `s3.tf`), basta con hacer merge de su PR
y volver a correr **Deploy infra**.

## Destruir la infraestructura

1. Opcional: `bash scripts/snapshot-data-volume.sh` para conservar los datos de Dgraph.
2. **Actions → Destroy infra → Run workflow** y escribir `destroy` para confirmar.

No cancelar un apply o destroy a la mitad: el state puede quedar bloqueado
(se libera con **Unlock** en el workspace de HCP).

## Restaurar desde un snapshot

Agregar `data_snapshot_id` como variable del workspace en HCP, o como
`TF_VAR_data_snapshot_id` en el workflow, antes de correr **Deploy infra**.
Un volumen restaurado ya tiene sistema de archivos, así que el arranque no lo formatea.

## Ejecutar Terraform a mano (CloudShell o local)

```bash
terraform login                 # pega el token de HCP Terraform
cd infra
cp terraform.tfvars.example terraform.tfvars   # completar credenciales
terraform init
terraform plan
```

En CloudShell, Terraform se instala con:

```bash
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://rpm.releases.hashicorp.com/AmazonLinux/hashicorp.repo
sudo dnf install -y terraform
```

## Agregar recursos

Cada integrante agrega su propio archivo en esta carpeta (`s3.tf`, `sns.tf`,
`lambda.tf`, `cloudwatch.tf`). Se pueden reutilizar `data.aws_iam_role.lab`,
`aws_instance.app` y `var.project_name`. Si la app necesita una variable nueva
(por ejemplo el nombre del bucket), se agrega en `local.app_env` de `secrets.tf`.
