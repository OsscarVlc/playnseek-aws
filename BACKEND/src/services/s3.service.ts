import { randomUUID } from 'node:crypto';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { obtenerClienteS3, obtenerNombreBucket } from '../config/s3.config';

// Servicio de almacenamiento de fotos de perfil en Amazon S3 (flujo 3).
// El bucket es privado: en MongoDB se guarda solo la key del objeto y las imágenes
// se muestran con URLs prefirmadas de corta duración (ver media.controller.ts).

export interface TipoImagen {
    extension: 'jpg' | 'png' | 'webp';
    contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export const TIPOS_IMAGEN_PERMITIDOS: readonly TipoImagen[] = [
    { extension: 'jpg', contentType: 'image/jpeg' },
    { extension: 'png', contentType: 'image/png' },
    { extension: 'webp', contentType: 'image/webp' },
];

export const TAMANO_MAXIMO_BYTES = 15 * 1024 * 1024; // igual que el límite de multer

export const CARPETA_PERFILES = 'perfiles';

// perfiles/<ObjectId de Mongo>/<uuid v4>.<jpg|png|webp>
const PATRON_KEY_PERFIL =
    /^perfiles\/[a-f0-9]{24}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

const PATRON_OBJECT_ID = /^[a-f0-9]{24}$/;

/**
 * Error de validación del archivo: el controlador lo convierte en un 400.
 */
export class ArchivoInvalidoError extends Error {
    constructor(mensaje: string) {
        super(mensaje);
        this.name = 'ArchivoInvalidoError';
    }
}

/**
 * Identifica el tipo real de la imagen leyendo sus primeros bytes ("magic numbers").
 * No confiamos en el mimetype ni en la extensión porque los manda el cliente y se pueden falsificar.
 */
export function detectarTipoImagen(buffer: Buffer): TipoImagen | null {
    const [jpg, png, webp] = TIPOS_IMAGEN_PERMITIDOS;

    // JPEG: FF D8 FF
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return jpg;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    const firmaPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(firmaPng)) {
        return png;
    }

    // WEBP: "RIFF" + 4 bytes de tamaño + "WEBP"
    if (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
        return webp;
    }

    return null;
}

/**
 * Valida tamaño y tipo del archivo. Devuelve el tipo detectado o lanza ArchivoInvalidoError.
 */
export function validarImagen(buffer: Buffer | undefined): TipoImagen {
    if (!buffer || buffer.length === 0) {
        throw new ArchivoInvalidoError('El archivo está vacío');
    }
    if (buffer.length > TAMANO_MAXIMO_BYTES) {
        throw new ArchivoInvalidoError('La imagen supera el tamaño máximo de 15 MB');
    }

    const tipo = detectarTipoImagen(buffer);
    if (!tipo) {
        throw new ArchivoInvalidoError('Formato no permitido. Usa una imagen JPG, PNG o WEBP');
    }
    return tipo;
}

/**
 * Arma una key única por usuario: perfiles/<usuarioId>/<uuid>.<ext>.
 * El uuid evita sobrescribir fotos y hace que la key no se pueda adivinar.
 */
export function construirKeyPerfil(usuarioId: string, extension: TipoImagen['extension']): string {
    if (!PATRON_OBJECT_ID.test(usuarioId)) {
        throw new ArchivoInvalidoError('Id de usuario inválido');
    }
    return `${CARPETA_PERFILES}/${usuarioId}/${randomUUID()}.${extension}`;
}

/**
 * Indica si un valor guardado en MongoDB es una key de foto de perfil de S3
 * (y no, por ejemplo, una URL antigua de Cloudinary). También protege la ruta /media
 * para que solo pueda firmar objetos dentro de perfiles/.
 */
export function esKeyDePerfilValida(key: string | undefined | null): key is string {
    return typeof key === 'string' && PATRON_KEY_PERFIL.test(key);
}

/**
 * Valida la imagen y la sube a S3. Devuelve la key que se guarda en MongoDB.
 */
export async function subirFotoPerfil(usuarioId: string, buffer: Buffer | undefined): Promise<string> {
    const tipo = validarImagen(buffer);
    const key = construirKeyPerfil(usuarioId, tipo.extension);

    await obtenerClienteS3().send(
        new PutObjectCommand({
            Bucket: obtenerNombreBucket(),
            Key: key,
            Body: buffer,
            ContentType: tipo.contentType,
            // la key nunca se reutiliza (uuid), así que el navegador puede guardarla en caché mucho tiempo
            CacheControl: 'private, max-age=31536000, immutable',
        }),
    );

    return key;
}

/**
 * Genera una URL prefirmada de lectura para un objeto privado del bucket.
 */
export async function generarUrlFirmada(key: string, segundos: number): Promise<string> {
    const comando = new GetObjectCommand({ Bucket: obtenerNombreBucket(), Key: key });
    return getSignedUrl(obtenerClienteS3(), comando, { expiresIn: segundos });
}

/**
 * Borra un objeto del bucket (por ejemplo la foto anterior al cambiarla).
 * Nunca lanza error: si falla, la foto nueva ya quedó guardada; solo se registra en logs.
 */
export async function eliminarObjeto(key: string): Promise<boolean> {
    try {
        await obtenerClienteS3().send(new DeleteObjectCommand({ Bucket: obtenerNombreBucket(), Key: key }));
        return true;
    } catch (err) {
        console.error(`No se pudo borrar ${key} de S3:`, err);
        return false;
    }
}
