/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         nombre:
 *           type: string
 *         edad:
 *           type: number
 *         sexo:
 *           type: string
 *           enum: [masculino, femenino, otro]
 *         correo:
 *           type: string
 *           format: email
 *         correo_confirmado:
 *           type: boolean
 *           default: false
 *         rol:
 *           type: string
 *           enum: [administrador, usuario, moderador]
 *           default: usuario
 *         isActive:
 *           type: boolean
 *           default: true
 *         foto_perfil:
 *           type: string
 *         zona_horaria:
 *           type: string
 *         horario_juego:
 *           type: string
 *         disponibilidad:
 *           type: array
 *           items:
 *             type: string
 *         idiomas:
 *           type: array
 *           items:
 *             type: string
 *         modo_juego:
 *           type: array
 *           items:
 *             type: string
 *         plataformas:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               gamertag:
 *                 type: string
 *     RegisterInput:
 *       type: object
 *       required: [name, email, password]
 *       properties:
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 8
 *     LoginInput:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *     Juego:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         titulo:
 *           type: string
 *         imagen:
 *           type: string
 *         generos:
 *           type: array
 *           items:
 *             type: string
 *         plataformas:
 *           type: array
 *           items:
 *             type: string
 *             enum: [pc, playstation, xbox, nintendo_switch, mobile]
 *         id_api:
 *           type: number
 *         activo:
 *           type: boolean
 *           default: true
 *     Grupo:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         nombre:
 *           type: string
 *         descripcion:
 *           type: string
 *         fecha_creacion:
 *           type: string
 *           format: date-time
 *         lider_id:
 *           type: string
 *         integrantes:
 *           type: array
 *           items:
 *             type: string
 *         activo:
 *           type: boolean
 *           default: true
 *     Post:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         usuario_id:
 *           type: string
 *         grupo_id:
 *           type: string
 *         contenido:
 *           type: string
 *         imagenes:
 *           type: array
 *           items:
 *             type: string
 *         fecha:
 *           type: string
 *           format: date-time
 *         activo:
 *           type: boolean
 *           default: true
 *     Comentario:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         post_id:
 *           type: string
 *         usuario_id:
 *           type: string
 *         contenido:
 *           type: string
 *         fecha:
 *           type: string
 *           format: date-time
 *     Reporte:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         remitente_id:
 *           type: string
 *         reportado_id:
 *           type: string
 *         motivo:
 *           type: string
 *           enum: [spam, acoso, contenido_inapropiado, otro]
 *         descripcion:
 *           type: string
 *         estado:
 *           type: string
 *           enum: [pendiente, resuelto, rechazado]
 *           default: pendiente
 *         fecha:
 *           type: string
 *           format: date-time
 *         grupo_id:
 *           type: string
 *         post_id:
 *           type: string
 *         comentario_id:
 *           type: string
 *     Solicitud:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         de_usuario:
 *           type: string
 *         a_usuario:
 *           type: string
 *         estado:
 *           type: string
 *           enum: [pendiente, aceptada, rechazada]
 *           default: pendiente
 *         fecha_creacion:
 *           type: string
 *           format: date-time
 *         fecha_respuesta:
 *           type: string
 *           format: date-time
 */
