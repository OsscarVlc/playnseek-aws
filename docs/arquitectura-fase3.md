# Arquitectura de PlayNSeek en AWS (Fase 3)

Guía para dibujar el diagrama en draw.io o Excalidraw. Cada componente indica en qué
grupo va y cada relación lleva el texto sugerido para la flecha.

## Componentes

| # | Componente | Grupo / contenedor en el diagrama | Detalle |
|---|---|---|---|
| 1 | Usuario (navegador) | Fuera de AWS | Páginas Handlebars + JS, Socket.io cliente |
| 2 | sslip.io (DNS) | Fuera de AWS | `34-197-94-85.sslip.io` → 34.197.94.85 |
| 3 | Let's Encrypt | Fuera de AWS | Emite y renueva el certificado (reto HTTP-01) |
| 4 | Elastic IP 34.197.94.85 | AWS › VPC por defecto | IP fija asociada a la EC2 |
| 5 | Security group `playnseek-tf-web-*` | AWS › VPC (borde alrededor de la EC2) | Entrada 80, 443, 22 |
| 6 | EC2 t3.medium (AL2023) | AWS › VPC › subred pública | Con rol LabRole (LabInstanceProfile) |
| 6a | Nginx | Dentro de la EC2 | TLS, redirección 80→443, proxy y WebSocket |
| 6b | App Express 5 + Socket.io (Node 24, systemd) | Dentro de la EC2 | 127.0.0.1:3000 |
| 6c | Dgraph (Docker Compose: zero + alpha) | Dentro de la EC2 | localhost:9080 |
| 6d | certbot + `certbot-renew.timer` | Dentro de la EC2 | Renueva el certificado |
| 7 | Volumen EBS gp3 20 GiB (cifrado) | AWS, pegado a la EC2 | `/data/dgraph`: datos de Dgraph y certificados |
| 8 | Bucket S3 `playnseek-perfiles-*` | AWS (servicio regional) | Privado, SSE-S3, fotos de perfil |
| 9 | Secrets Manager `playnseek/app-env` | AWS | Variables de `BACKEND/.env` |
| 10 | SNS topic `playnseek-matches` | AWS | Evento `match_creado` |
| 11 | Lambda `playnseek-notificar-match` | AWS | Manda el correo de match (Sergio) |
| 12 | CloudWatch | AWS | Logs de Lambda, métricas, alarmas y dashboard |
| 13 | MongoDB Atlas (base PlayNSeekNube) | Fuera de AWS (SaaS) | Usuarios, grupos, mensajes, keys de fotos |
| 14 | Gmail SMTP | Fuera de AWS | Correos de confirmación y de match |
| 15 | GitHub (repo + Actions) | Fuera de AWS | Workflows CI, Deploy, Deploy infra, Destroy infra |
| 16 | HCP Terraform | Fuera de AWS | Guarda el state (workspace `playnseek-aws`, Execution Mode Local) |

## Relaciones (flechas)

**Tráfico de usuarios**

1. Usuario → sslip.io: "resuelve el dominio"
2. Usuario → Elastic IP → Nginx: "HTTPS 443 / WSS (Socket.io)"; y "HTTP 80 → 301 a HTTPS"
3. Nginx → App Express/Socket.io: "proxy http://127.0.0.1:3000 + Upgrade WebSocket"
4. App → Dgraph: "gRPC localhost:9080 (matches, recomendaciones)"
5. Dgraph → EBS: "datos persistentes"
6. App → MongoDB Atlas: "mongodb+srv (TLS)"

**Flujo 3: fotos de perfil**

7. Usuario → App: "PATCH /user/actualizar (multipart, máx. 15 MB)"
8. App → S3: "PutObject perfiles/<id>/<uuid>.<ext> (credenciales de LabRole)"
9. App → MongoDB Atlas: "guarda la key en foto_perfil"
10. Usuario → App: "GET /media/perfiles/..." y App → Usuario: "302 URL prefirmada (10 min)"
11. Usuario → S3: "GET con URL prefirmada" (flecha punteada directo del navegador al bucket)

**Flujo 2: match (Sergio)**

12. App → SNS: "Publish match_creado"
13. SNS → Lambda: "invoca (suscripción)"
14. Lambda → Gmail SMTP: "correo a los dos usuarios"
15. Lambda → CloudWatch: "logs"

**Configuración, certificados y observabilidad**

16. EC2 → Secrets Manager: "GetSecretValue al arrancar y en cada Deploy (escribe .env)"
17. certbot → Let's Encrypt: "pide y renueva el certificado"; Let's Encrypt → Nginx: "reto HTTP-01 por el puerto 80"
18. certbot → EBS: "guarda /etc/letsencrypt"
19. EC2 / Lambda → CloudWatch: "métricas y alarmas → dashboard"

**CI/CD e infraestructura como código**

20. GitHub Actions (CI) → "lint, build, jest en cada PR"
21. GitHub Actions (Deploy) → EC2: "SSH: git pull, npm ci, build, refresh-env, setup-https, restart"
22. GitHub Actions (Deploy infra / Destroy infra) → AWS: "terraform apply/destroy (credenciales del Learner Lab)"
23. GitHub Actions (Deploy infra) ↔ HCP Terraform: "lee y guarda el state"
24. EC2 → GitHub: "clona el repo en el primer arranque (user_data)"

## Sugerencias de dibujo

- Un rectángulo grande "AWS Cloud (us-east-1)" con otro dentro "VPC por defecto" y
  dentro la subred pública con la EC2. S3, Secrets Manager, SNS, Lambda y CloudWatch
  van dentro de AWS pero fuera de la VPC (son servicios regionales).
- Dentro de la EC2, tres cajas: Nginx, App y Dgraph (con el ícono de Docker), y el
  EBS pegado por fuera.
- Usar los íconos oficiales de AWS (draw.io: *More Shapes → AWS 2025*).
- Colores por tipo de flecha: tráfico de usuarios en azul, flujo 3 (S3) en verde,
  flujo 2 (SNS/Lambda) en naranja, CI/CD en gris punteado.
