import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { obtenerRecomendaciones } from '../controllers/recomendacion.controller';

const router = Router();

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
router.get('/', authMiddleware, obtenerRecomendaciones);

export default router;
