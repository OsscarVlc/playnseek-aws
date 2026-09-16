"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const post_controller_1 = require("../controllers/post.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /post:
 *   post:
 *     tags: [Posts]
 *     summary: Crear un post dentro de un grupo
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [grupo_id, contenido]
 *             properties:
 *               grupo_id: { type: string }
 *               contenido: { type: string }
 *               imagen:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Post creado exitosamente.
 *       400:
 *         description: Falta grupo_id o contenido.
 *   get:
 *     tags: [Posts]
 *     summary: Listar posts (requiere ser integrante del grupo si se filtra por grupo_id)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: incluirInactivos
 *         schema: { type: boolean, default: false }
 *       - in: query
 *         name: grupo_id
 *         schema: { type: string }
 *         description: Filtrar posts de un grupo específico. Requiere ser integrante del grupo (o admin).
 *     responses:
 *       200:
 *         description: Lista paginada de posts.
 *       401:
 *         description: Debes iniciar sesión para ver los posts de un grupo.
 *       403:
 *         description: Debes ser integrante del grupo para ver sus posts.
 *       404:
 *         description: Grupo no encontrado.
 */
router.post('/', auth_middleware_1.authMiddleware, upload_middleware_1.upload.single('imagen'), post_controller_1.crearPost);
router.get('/', auth_middleware_1.authMiddleware, post_controller_1.listarPosts);
/**
 * @swagger
 * /post/{id}:
 *   get:
 *     tags: [Posts]
 *     summary: Obtener un post por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Datos del post.
 *       404:
 *         description: Post no encontrado.
 *   patch:
 *     tags: [Posts]
 *     summary: Actualizar contenido/imágenes (solo el autor)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contenido: { type: string }
 *               imagenes:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Post actualizado.
 *       403:
 *         description: No eres el autor de este post.
 *   delete:
 *     tags: [Posts]
 *     summary: Eliminar (soft delete) un post (solo el autor)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post eliminado correctamente.
 *       403:
 *         description: No eres el autor de este post.
 */
router.get('/:id', post_controller_1.obtenerPost);
router.patch('/:id', auth_middleware_1.authMiddleware, post_controller_1.actualizarPost);
router.delete('/:id', auth_middleware_1.authMiddleware, post_controller_1.eliminarPost);
exports.default = router;
