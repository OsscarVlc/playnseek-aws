import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
    enviarSolicitud,
    listarSolicitudesRecibidas,
    responderSolicitud,
    listarSolicitudesEnviadas,
    cancelarSolicitud,
} from '../controllers/solicitud.controller';

const router = Router();

/**
 * @swagger
 * /solicitud:
 *   post:
 *     tags: [Solicitudes]
 *     summary: Enviar una solicitud de match a otro usuario
 *     description: Si el otro usuario ya te había enviado una solicitud pendiente, se hace match automáticamente.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [aUsuario]
 *             properties:
 *               aUsuario:
 *                 type: string
 *     responses:
 *       201:
 *         description: Solicitud enviada exitosamente.
 *       200:
 *         description: Es un match (auto-aceptado por solicitud mutua).
 *       400:
 *         description: Solicitud inválida (a ti mismo, o ya existe una pendiente).
 */
router.post('/', authMiddleware, enviarSolicitud);

/**
 * @swagger
 * /solicitud/recibidas:
 *   get:
 *     tags: [Solicitudes]
 *     summary: Listar solicitudes pendientes recibidas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de solicitudes pendientes recibidas.
 */
router.get('/recibidas', authMiddleware, listarSolicitudesRecibidas);

/**
 * @swagger
 * /solicitud/enviadas:
 *   get:
 *     tags: [Solicitudes]
 *     summary: Listar todas las solicitudes enviadas (con su estado actual)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de solicitudes enviadas, sin importar su estado.
 */
router.get('/enviadas', authMiddleware, listarSolicitudesEnviadas);

/**
 * @swagger
 * /solicitud/{id}/responder:
 *   patch:
 *     tags: [Solicitudes]
 *     summary: Aceptar o rechazar una solicitud recibida
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
 *             required: [respuesta]
 *             properties:
 *               respuesta:
 *                 type: string
 *                 enum: [aceptar, rechazar]
 *     responses:
 *       200:
 *         description: Solicitud respondida (match creado si se aceptó).
 *       403:
 *         description: No puedes responder una solicitud que no es tuya.
 *       400:
 *         description: Respuesta inválida, o la solicitud ya fue respondida.
 *       404:
 *         description: Solicitud no encontrada.
 */
router.patch('/:id/responder', authMiddleware, responderSolicitud);

/**
 * @swagger
 * /solicitud/{id}:
 *   delete:
 *     tags: [Solicitudes]
 *     summary: Cancelar una solicitud enviada (solo si sigue pendiente)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Solicitud cancelada exitosamente.
 *       403:
 *         description: No puedes cancelar una solicitud que no enviaste tú.
 *       400:
 *         description: Solo se pueden cancelar solicitudes pendientes.
 *       404:
 *         description: Solicitud no encontrada.
 */
router.delete('/:id', authMiddleware, cancelarSolicitud);

export default router;
