# Estado del despliegue — Fase 2

## Implementado y comprobado

- Aplicación TypeScript, Express, Handlebars y Socket.io desplegada en EC2.
- Nginx configurado como proxy hacia el backend.
- Página accesible por HTTP; carga de estilos e inicio de sesión verificados.
- Backend conectado a MongoDB Atlas.
- Dgraph v25.3.8 ejecutándose con Docker Compose y respuesta healthy.
- Volumen EBS gp3 de 20 GiB montado en /data/dgraph.
- Directorios separados para los datos de Dgraph Zero y Alpha.
- Montaje automático configurado mediante UUID en /etc/fstab.
- Servicios systemd configurados para iniciar la aplicación y Dgraph.
- Arranque de Dgraph condicionado al montaje del volumen.
- Instalación limpia con npm ci y compilación verificadas en una copia temporal.

## Distribución acordada

- Oscar: infraestructura EC2, persistencia de Dgraph y despliegue.
- Sofía: integración de imágenes con S3.
- Sergio: Lambda para revisar inconsistencias entre MongoDB y Dgraph.

## Pendientes

- Integrar S3 y Lambda.
- Definir con Sergio qué inconsistencias se repararán y cuáles
  justifican eliminar datos
- Resolver la migración o reconstrucción de los datos de Dgraph.
- Validar registro, confirmación por correo, matches y chat en AWS.
- Probar el arranque y la persistencia después de reiniciar EC2.
- Implementar respaldos y probar la recuperación.
- Configurar HTTPS.
- Completar los requisitos posteriores de CI/CD y monitoreo.

## Consideraciones del laboratorio

- Se utiliza LabRole mediante LabInstanceProfile.
- La IP pública puede cambiar al detener e iniciar EC2.
- Si cambia, revisar APP_URL, la configuración de Nginx y
  la lista de acceso de MongoDB Atlas.
- EBS proporciona persistencia; no sustituye los respaldos.