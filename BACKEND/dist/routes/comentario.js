"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const comentario_controller_1 = require("../controllers/comentario.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /comentario:
 *   post:
 *     tags: [Comentarios]
 *     summary: Comentar en un post
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [post_id, contenido]
 *             properties:
 *               post_id: { type: string }
 *               contenido: { type: string }
 *     responses:
 *       201:
 *         description: Comentario creado exitosamente.
 *       400:
 *         description: Falta post_id o contenido.
 *   get:
 *     tags: [Comentarios]
 *     summary: Listar comentarios
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: post_id
 *         schema: { type: string }
 *         description: Filtrar comentarios de un post específico.
 *     responses:
 *       200:
 *         description: Lista paginada de comentarios.
 */
router.post('/', auth_middleware_1.authMiddleware, comentario_controller_1.crearComentario);
router.get('/', comentario_controller_1.listarComentarios);
/**
 * @swagger
 * /comentario/{id}:
 *   patch:
 *     tags: [Comentarios]
 *     summary: Editar un comentario (solo el autor)
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
 *     responses:
 *       200:
 *         description: Comentario actualizado.
 *       403:
 *         description: No eres el autor de este comentario.
 *   delete:
 *     tags: [Comentarios]
 *     summary: Eliminar un comentario permanentemente (solo el autor)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Comentario eliminado correctamente.
 *       403:
 *         description: No eres el autor de este comentario.
 */
router.delete('/:id', auth_middleware_1.authMiddleware, comentario_controller_1.eliminarComentario);
router.patch('/:id', auth_middleware_1.authMiddleware, comentario_controller_1.actualizarComentario);
exports.default = router;
