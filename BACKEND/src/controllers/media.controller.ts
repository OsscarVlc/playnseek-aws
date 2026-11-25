import { Request, Response } from 'express';
import { HttpStatus } from '../types/https-status';
import { CARPETA_PERFILES, esKeyDePerfilValida, generarUrlFirmada } from '../services/s3.service';

// Sirve las fotos de perfil sin hacer público el bucket.
// En vez de mandar los bytes por la EC2, se genera una URL prefirmada de S3 y se redirige:
// el navegador descarga la imagen directo de S3 y la app solo firma (unos milisegundos).

// La URL firmada dura 10 minutos; el navegador guarda la redirección 9 minutos,
// así nunca reutiliza una URL que ya expiró.
export const DURACION_URL_SEGUNDOS = 600;
const CACHE_REDIRECCION_SEGUNDOS = DURACION_URL_SEGUNDOS - 60;

/**
 * GET /media/perfiles/:usuarioId/:archivo -> 302 a una URL prefirmada de S3.
 */
export async function redirigirFotoPerfil(req: Request, res: Response) {
    const { usuarioId, archivo } = req.params;
    const key = `${CARPETA_PERFILES}/${String(usuarioId)}/${String(archivo)}`;

    // solo se firman keys con el formato exacto de foto de perfil:
    // evita que alguien use esta ruta para leer otros objetos del bucket
    if (!esKeyDePerfilValida(key)) {
        return res.status(HttpStatus.NOT_FOUND).json({ message: 'Imagen no encontrada' });
    }

    try {
        const url = await generarUrlFirmada(key, DURACION_URL_SEGUNDOS);
        res.set('Cache-Control', `private, max-age=${CACHE_REDIRECCION_SEGUNDOS}`);
        return res.redirect(302, url);
    } catch (err) {
        console.error('No se pudo firmar la URL de la foto de perfil:', err);
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
