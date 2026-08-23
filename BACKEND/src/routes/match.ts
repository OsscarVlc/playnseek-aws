import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { listarMisMatches, eliminarMatch } from '../controllers/match.controller';

const router = Router();

router.get('/mis-matches', authMiddleware, listarMisMatches);

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
router.delete('/:id', authMiddleware, eliminarMatch);

export default router;
