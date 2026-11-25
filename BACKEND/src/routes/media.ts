// rutas de archivos guardados en S3
import { Router } from 'express';
import { redirigirFotoPerfil } from '../controllers/media.controller';

const router = Router();

/**
 * @swagger
 * /media/perfiles/{usuarioId}/{archivo}:
 *   get:
 *     tags: [Media]
 *     summary: Mostrar una foto de perfil guardada en S3
 *     description: El bucket es privado. La ruta genera una URL prefirmada de 10 minutos y redirige a ella.
 *     parameters:
 *       - in: path
 *         name: usuarioId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: archivo
 *         required: true
 *         schema:
 *           type: string
 *           example: 3f1c2a9e-1b2c-4d5e-8f90-123456789abc.jpg
 *     responses:
 *       302:
 *         description: Redirección a la URL prefirmada de S3.
 *       404:
 *         description: La ruta no corresponde a una foto de perfil válida.
 */
router.get('/perfiles/:usuarioId/:archivo', redirigirFotoPerfil);

export default router;
