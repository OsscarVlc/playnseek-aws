# PlayNSeek

Plataforma para encontrar compañeros de videojuegos según sus
intereses y preferencias. Incluye cuentas de usuario, solicitudes,
matches y comunicación mediante chat.

Proyecto integrador de Desarrollo en la Nube, ITESO.

## Tecnologías

- Backend: TypeScript, Node.js, Express y Socket.io.
- Frontend: Handlebars, JavaScript y CSS.
- Bases de datos: MongoDB Atlas y Dgraph.
- Despliegue: AWS EC2, EBS, Docker Compose, Nginx y systemd.

## Estado de la Fase 2

La aplicación está desplegada en EC2 y conectada a MongoDB Atlas.
Dgraph se ejecuta en contenedores con almacenamiento persistente
en un volumen EBS.

Se verificaron la carga de la página, el inicio de sesión,
la salud de Dgraph y sus montajes de almacenamiento.

S3 y Lambda están pendientes de integración. Los datos de Dgraph
local todavía no se han migrado al despliegue de AWS.

## Documentación

- [Despliegue en AWS](docs/despliegue-aws.md)
- [Avances, responsables y pendientes](docs/estado-fase2.md)

## Ejecución local

Requisitos: Node.js 24, npm y Docker con Docker Compose.

Desde la raíz del repositorio:

    docker compose up -d

Crear BACKEND/.env a partir de BACKEND/.env.example y completar
las variables de entorno.

Desde BACKEND:

    npm ci
    npm run build
    npm start

Abrir http://localhost:3000.

Para desarrollo:

    npm run dev

El Compose local utiliza su propio volumen de datos.
No comparte automáticamente información con Dgraph en AWS.

## Pruebas

Desde BACKEND:

    npm test

La ejecución completa de las pruebas en AWS está pendiente.

## Equipo

- Oscar Emanuel Velasco Casas.
- Sergio Orozco Miranda.
- Sofía Mercado Moreno.

## Configuración y credenciales

El archivo .env no debe subirse al repositorio.
.env.example documenta las variables necesarias.

Los scripts de AWS utilizan el perfil LabInstanceProfile
con LabRole. Los identificadores de infraestructura deben
adaptarse a la cuenta donde se despliegue.