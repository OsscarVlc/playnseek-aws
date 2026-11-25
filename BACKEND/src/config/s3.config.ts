import { S3Client } from '@aws-sdk/client-s3';

// Configuración del cliente de Amazon S3 (fotos de perfil).
// No se pasan llaves: en EC2 el SDK toma credenciales temporales del rol de la
// instancia (LabInstanceProfile -> LabRole). En local usa ~/.aws o variables AWS_*.

let clienteS3: S3Client | undefined;

/**
 * Devuelve un único cliente de S3 para toda la app (se crea la primera vez que se usa).
 * Crearlo bajo demanda evita fallar al arrancar si S3 no está configurado (por ejemplo en CI).
 */
export function obtenerClienteS3(): S3Client {
    clienteS3 ??= new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    return clienteS3;
}

/**
 * Nombre del bucket de fotos. Terraform lo escribe en S3_BUCKET (local.app_env en infra/secrets.tf).
 */
export function obtenerNombreBucket(): string {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
        throw new Error('S3_BUCKET no está configurado');
    }
    return bucket;
}
