# PlayNSeek

Plataforma para encontrar compañeros de videojuegos según sus
intereses y preferencias. Incluye cuentas de usuario, solicitudes,
matches y comunicación mediante chat.

Proyecto integrador de Desarrollo en la Nube, ITESO.

## Tecnologías

- Backend: TypeScript, Node.js, Express y Socket.io.
- Frontend: Handlebars, JavaScript y CSS.
- Bases de datos: MongoDB Atlas y Dgraph.
- Despliegue: AWS EC2, EBS, Secrets Manager, Docker Compose, Nginx y systemd.
- Infraestructura como código: Terraform.
- CI/CD: GitHub Actions.

## Despliegue en AWS

La infraestructura se crea con Terraform desde `infra/`:

    cd infra
    cp terraform.tfvars.example terraform.tfvars
    terraform init
    terraform apply

Un solo `apply` crea EC2, Elastic IP, volumen EBS para Dgraph, security group y el
secreto con las variables de entorno, y deja la aplicación funcionando.
Instrucciones completas en [infra/README.md](infra/README.md).

## CI/CD

- **CI** (`.github/workflows/ci.yml`): en cada Pull Request se ejecutan lint,
  build y pruebas unitarias.
- **CD** (`.github/workflows/deploy.yml`): al integrar en `main` se repiten las
  pruebas y, si pasan, se actualiza la app en EC2 por SSH y se verifica que responda.

## Documentación

- [Infraestructura con Terraform](infra/README.md)
- [Despliegue manual paso a paso (Fase 2)](docs/despliegue-aws.md)
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

Las mismas pruebas se ejecutan en GitHub Actions en cada Pull Request.

## Equipo

- Oscar Emanuel Velasco Casas.
- Sergio Orozco Miranda.
- Sofía Mercado Moreno.

## Configuración y credenciales

El archivo .env no debe subirse al repositorio.
.env.example documenta las variables necesarias.

En AWS las variables se guardan en Secrets Manager y la instancia
genera BACKEND/.env en el arranque. infra/terraform.tfvars tampoco
se sube al repositorio. Se utilizan LabInstanceProfile y LabRole
porque Learner Lab no permite crear roles.