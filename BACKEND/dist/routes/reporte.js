"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reporte_controller_1 = require("../controllers/reporte.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const allowRoles_1 = require("../middlewares/allowRoles");
const router = (0, express_1.Router)();
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
router.post('/', auth_middleware_1.authMiddleware, reporte_controller_1.crearReporte);
router.get('/', auth_middleware_1.authMiddleware, allowRoles_1.requireModerador, reporte_controller_1.listarReportes);
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
router.get('/:id', auth_middleware_1.authMiddleware, allowRoles_1.requireModerador, reporte_controller_1.obtenerReporte);
router.patch('/:id', auth_middleware_1.authMiddleware, allowRoles_1.requireModerador, reporte_controller_1.actualizarReporte);
exports.default = router;
