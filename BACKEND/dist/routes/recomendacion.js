"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const recomendacion_controller_1 = require("../controllers/recomendacion.controller");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /recomendacion:
 *   get:
 *     tags: [Recomendaciones]
 *     summary: Obtener recomendaciones de posibles matches
 *     description: Prioriza usuarios por idioma en común, luego plataforma en común, luego juegos en común. Excluye a quienes ya son match.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Lista de usuarios recomendados.
 */
router.get('/', auth_middleware_1.authMiddleware, recomendacion_controller_1.obtenerRecomendaciones);
exports.default = router;
