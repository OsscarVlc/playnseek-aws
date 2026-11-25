// Convierte lo que se guarda en MongoDB (foto_perfil) en una URL que el navegador puede usar.
// - Key de S3 (perfiles/<id>/<uuid>.jpg)   -> /media/perfiles/<id>/<uuid>.jpg (el backend firma y redirige)
// - URL completa (fotos viejas de Cloudinary) -> se deja igual, así no se rompen perfiles existentes
// Vive en utils/ porque lo usan el modelo, los controladores y los helpers de Handlebars
// sin depender del SDK de AWS.

export const PREFIJO_MEDIA = '/media/';

/**
 * Devuelve la URL pública (dentro de la app) de una foto de perfil, o undefined si no hay foto.
 */
export function urlFotoPerfil(valor?: string | null): string | undefined {
    if (!valor) return undefined;
    if (/^https?:\/\//i.test(valor) || valor.startsWith('/')) return valor;
    return `${PREFIJO_MEDIA}${valor}`;
}
