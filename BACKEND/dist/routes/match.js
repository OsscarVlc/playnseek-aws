"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const match_controller_1 = require("../controllers/match.controller");
const router = (0, express_1.Router)();
router.get('/mis-matches', auth_middleware_1.authMiddleware, match_controller_1.listarMisMatches);
/**
 * @swagger
 * /match/{id}:
 *   delete:
 *     tags: [Matches]
 *     summary: Eliminar un match (dejar de ser amigos)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: mongo_id del compañero con el que se quiere terminar el match
 *     responses:
 *       200:
 *         description: Match eliminado correctamente
 *       500:
 *         description: No se encontró el match o error del servidor
 */
router.delete('/:id', auth_middleware_1.authMiddleware, match_controller_1.eliminarMatch);
exports.default = router;
