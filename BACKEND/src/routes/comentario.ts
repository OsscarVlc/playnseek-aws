import { Router } from 'express';
import {
    crearComentario,
    listarComentarios,
    eliminarComentario,
    actualizarComentario,
} from '../controllers/comentario.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

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
router.post('/', authMiddleware, crearComentario);
router.get('/', listarComentarios);

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
router.delete('/:id', authMiddleware, eliminarComentario);
router.patch('/:id', authMiddleware, actualizarComentario);

export default router;
