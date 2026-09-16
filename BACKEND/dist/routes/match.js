"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const match_controller_1 = require("../controllers/match.controller");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /match/mis-matches:
 *   get:
 *     tags: [Matches]
 *     summary: Listar mis matches confirmados
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de matches, con los datos del compañero de cada uno.
 */
router.get('/mis-matches', auth_middleware_1.authMiddleware, match_controller_1.listarMisMatches);
exports.default = router;
