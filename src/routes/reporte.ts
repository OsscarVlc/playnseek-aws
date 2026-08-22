import { Router } from 'express';
import { crearReporte, listarReportes, obtenerReporte, actualizarReporte } from '../controllers/reporte.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireModerador } from '../middlewares/allowRoles';

const router = Router();

/**
 * @swagger
 * /reporte:
 *   post:
 *     tags: [Reportes]
 *     summary: Crear un reporte contra un usuario
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reportado_id, motivo]
 *             properties:
 *               reportado_id: { type: string }
 *               motivo:
 *                 type: string
 *                 enum: [spam, acoso, contenido_inapropiado, otro]
 *               descripcion: { type: string }
 *               grupo_id: { type: string }
 *               post_id: { type: string }
 *               comentario_id: { type: string }
 *     responses:
 *       201:
 *         description: Reporte creado exitosamente.
 *       400:
 *         description: Falta reportado_id/motivo, o intentaste reportarte a ti mismo.
 *   get:
 *     tags: [Reportes]
 *     summary: Listar reportes (solo admin o moderador)
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
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [pendiente, resuelto, rechazado]
 *     responses:
 *       200:
 *         description: Lista paginada de reportes.
 *       403:
 *         description: No tienes permisos de moderador o administrador.
 */
router.post('/', authMiddleware, crearReporte);
router.get('/', authMiddleware, requireModerador, listarReportes);

/**
 * @swagger
 * /reporte/{id}:
 *   get:
 *     tags: [Reportes]
 *     summary: Obtener un reporte por ID (solo admin o moderador)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Datos del reporte.
 *       403:
 *         description: No tienes permisos de moderador o administrador.
 *       404:
 *         description: Reporte no encontrado.
 *   patch:
 *     tags: [Reportes]
 *     summary: Cambiar el estado de un reporte (solo admin o moderador)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [pendiente, resuelto, rechazado]
 *     responses:
 *       200:
 *         description: Reporte actualizado.
 *       400:
 *         description: Falta el campo estado.
 *       403:
 *         description: No tienes permisos de moderador o administrador.
 */
router.get('/:id', authMiddleware, requireModerador, obtenerReporte);
router.patch('/:id', authMiddleware, requireModerador, actualizarReporte);

export default router;
