import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { TAMANO_MAXIMO_BYTES, TIPOS_IMAGEN_PERMITIDOS } from '../services/s3.service';
import { HttpStatus } from '../types/https-status';

// guardamos temporalmente en memoria porque de ahi
// lo subimos directo a la nube (Cloudinary para posts, S3 para fotos de perfil)
// sin necesitar un archivo fisico intermedio
const storage = multer.memoryStorage();

// Uso general (imágenes de posts): cualquier imagen de hasta 15 MB.
export const upload = multer({
    storage,
    limits: { fileSize: TAMANO_MAXIMO_BYTES }, // 15MB maximo
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Solo se permiten archivos de imagen'));
        }
        cb(null, true);
    },
});

const MIMETYPES_FOTO_PERFIL = TIPOS_IMAGEN_PERMITIDOS.map((t) => t.contentType as string);

// Fotos de perfil (S3): solo JPG, PNG o WEBP. Este filtro es una primera revisión rápida
// con el mimetype que manda el navegador; s3.service vuelve a validar con los bytes reales.
const uploadFotoPerfil = multer({
    storage,
    limits: { fileSize: TAMANO_MAXIMO_BYTES, files: 1 },
    fileFilter: (req, file, cb) => {
        if (!MIMETYPES_FOTO_PERFIL.includes(file.mimetype)) {
            return cb(new Error('Formato no permitido. Usa una imagen JPG, PNG o WEBP'));
        }
        cb(null, true);
    },
});

/**
 * Recibe el campo foto_perfil y, si multer lo rechaza (tamaño o formato),
 * responde 400 con un JSON claro en vez del error 500 genérico de Express.
 */
export function recibirFotoPerfil(req: Request, res: Response, next: NextFunction) {
    uploadFotoPerfil.single('foto_perfil')(req, res, (err: unknown) => {
        if (!err) return next();

        const mensaje =
            err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
                ? 'La imagen supera el tamaño máximo de 15 MB'
                : (err as Error).message;

        return res.status(HttpStatus.BAD_REQUEST).json({ message: mensaje });
    });
}
