import { Router } from 'express';
import { crearPost, eliminarPost, actualizarPost, obtenerPost, listarPosts } from '../controllers/post.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

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
router.post('/', authMiddleware, upload.single('imagen'), crearPost);
router.get('/', authMiddleware, listarPosts);

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
router.get('/:id', obtenerPost);
router.patch('/:id', authMiddleware, actualizarPost);
router.delete('/:id', authMiddleware, eliminarPost);

export default router;
