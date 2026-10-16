# Despliegue de PlayNSeek en AWS Learner Lab

## 1. Requisitos

- Learner Lab activo en us-east-1
- VPC con una subred pública y salida mediante Internet Gateway.
- MongoDB Atlas y credenciales de los servicios utilizados.
- Rama fase2-despliegue disponible en GitHub.


## 2. Preparar la infraestructura desde CloudShell

Clonar el repositorio:

```bash
git clone --branch fase2-despliegue --single-branch https://github.com/OsscarVlc/playnseek-aws.git
cd playnseek-aws
```

Revisar scripts/aws-config.sh y ajustar los valores a la cuenta:
región, VPC, subred, perfil de instancia, AMI y tipo de instancia.
Los identificadores del laboratorio original no son reutilizables
en otra cuenta.

Crear el grupo de seguridad:

```bash
bash scripts/create-security-group.sh
```

Actualizar SECURITY_GROUP_ID en scripts/aws-config.sh con el
identificador obtenido antes de crear EC2.

```bash
bash scripts/create-ec2.sh
```

Guardar el ID de la instancia y crear su volumen:

```bash
bash scripts/create-data-volume.sh <INSTANCE_ID>
bash scripts/attach-data-volume.sh <INSTANCE_ID> <VOLUME_ID>
```

El volumen debe estar en la misma zona de disponibilidad que EC2.

Conectarse cuando la instancia aparezca Online en Systems Manager:

```bash
aws ssm start-session --region us-east-1 --target <INSTANCE_ID>
```

## 3. Instalar herramientas dentro de EC2

Descargar y ejecutar el script inicial:

```bash
cd ~
curl --fail --show-error --location https://raw.githubusercontent.com/OsscarVlc/playnseek-aws/fase2-despliegue/scripts/setup-server.sh -o setup-server.sh
bash setup-server.sh
```

Clonar el repositorio en EC2:

```bash
git clone --branch fase2-despliegue --single-branch https://github.com/OsscarVlc/playnseek-aws.git
cd playnseek-aws
```

Si la descarga inicial no incluye Docker Compose, ejecutar la
versión del repositorio:

```bash
bash scripts/setup-server.sh
```

## 4. Preparar el volumen de datos

Identificar el disco mediante tamaño y número de serie:

```bash
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS,SERIAL
```

El número de serie debe corresponder al VOLUME_ID creado.
En instancias Nitro, /dev/sdf puede aparecer como /dev/nvme1n1
u otro nombre NVMe. No asumir el nombre del dispositivo.

Sólo para un volumen NUEVO, vacío y confirmado, sin particiones
ni sistema de archivos, crear XFS:

```bash
sudo mkfs -t xfs /dev/<DISPOSITIVO_CONFIRMADO>
```

No ejecutar mkfs sobre un volumen existente ni restaurado:
formatear puede destruir sus datos.

Consultar el UUID:

```bash
sudo blkid /dev/<DISPOSITIVO_CONFIRMADO>
```

Configurar el montaje utilizando el UUID obtenido:

```bash
bash scripts/mount-data-volume.sh <UUID>
```

El script configura /data/dgraph y su entrada en /etc/fstab.
No formatea el volumen.

## 5. Iniciar Dgraph

Desde la raíz del repositorio en EC2:

```bash
bash scripts/setup-dgraph-service.sh
sudo docker compose -f docker-compose.aws.yml ps
curl --fail --show-error http://127.0.0.1:8080/health
```

Esperar a que la respuesta indique healthy.

El servicio utiliza Dgraph v25.3.8 y almacena sus datos en:

- /data/dgraph/zero
- /data/dgraph/alpha

Los puertos 8080 y 9080 sólo se publican en localhost.
Un despliegue nuevo no contiene los datos del Dgraph local.

## 6. Preparar la aplicación

```bash
cd BACKEND
npm ci
npm run build
cp -n .env.example .env
chmod 600 .env
nano .env
```

Completar las credenciales y configurar:

```env
DGRAPH_ADDRESS=localhost:9080
PORT=3000
APP_URL=http://<IP_PUBLICA>
```

Autorizar la IP pública de EC2 en MongoDB Atlas, preferentemente
mediante una entrada específica /32.

La instalación limpia y el build se verificaron con Node.js
24.21.0 y npm 11.19.0. Conservar package-lock.json y usar npm ci.

## 7. Configurar los servicios

Desde la raíz del repositorio:

```bash
cd ~/playnseek-aws
bash scripts/setup-app-service.sh
sudo journalctl -u playnseek-app.service -n 30 --no-pager
```

Confirmar conexión con MongoDB y arranque en el puerto 3000.

Configurar Nginx:

```bash
bash scripts/setup-nginx.sh <IP_PUBLICA>
```

Abrir http://<IP_PUBLICA> y comprobar página e inicio de sesión.
HTTPS está pendiente.

## 8. Operación básica

Consultar el estado:

```bash
systemctl is-active docker nginx playnseek-dgraph playnseek-app
```

Consultar logs del backend:

```bash
sudo journalctl -u playnseek-app.service -n 50 --no-pager
```

Consultar logs de Dgraph desde la raíz del repositorio:

```bash
sudo docker compose -f docker-compose.aws.yml logs --tail 50
```

Después de modificar .env:

```bash
sudo systemctl restart playnseek-app.service
```

## 9. Reinicios y cambios de IP

Los servicios están habilitados para iniciar al arrancar EC2,
pero la prueba completa de reinicio sigue pendiente.

Si cambia la IP pública:

1. Actualizar la entrada de acceso en MongoDB Atlas.
2. Actualizar APP_URL en BACKEND/.env.
3. Ejecutar setup-nginx.sh con la nueva IP.
4. Reiniciar playnseek-app.service.

El volumen EBS de datos debe conservarse. No eliminarlo ni
formatearlo al actualizar la aplicación.

## 10. Alcance actual

Se verificaron la página, el inicio de sesión, la conexión a Atlas,
la salud de Dgraph y los montajes de sus contenedores en EBS.

Pendientes: S3, Lambda, migración o reconciliación del grafo,
validación de los demás flujos, respaldos, recuperación y HTTPS.
