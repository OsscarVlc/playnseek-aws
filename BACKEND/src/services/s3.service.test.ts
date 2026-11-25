import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { obtenerClienteS3 } from '../config/s3.config';
import {
    ArchivoInvalidoError,
    construirKeyPerfil,
    detectarTipoImagen,
    eliminarObjeto,
    esKeyDePerfilValida,
    generarUrlFirmada,
    subirFotoPerfil,
    TAMANO_MAXIMO_BYTES,
    validarImagen,
} from './s3.service';

// No se llama a AWS: el cliente de S3 y el firmador se reemplazan por mocks.
// Los comandos (PutObjectCommand, etc.) sí son los reales, para revisar sus parámetros.
jest.mock('../config/s3.config', () => ({
    obtenerClienteS3: jest.fn(),
    obtenerNombreBucket: jest.fn(() => 'bucket-pruebas'),
}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn(),
}));

const BUCKET = 'bucket-pruebas'; // el mismo nombre que devuelve el mock de obtenerNombreBucket
const USUARIO_ID = '64b7f0c2a1b2c3d4e5f60718';
const PATRON_UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

// Encabezados mínimos ("magic numbers") de cada formato, seguidos de bytes de relleno
const bufferJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const bufferPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const bufferWebp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x24, 0, 0, 0]), Buffer.from('WEBPVP8 ')]);
const bufferGif = Buffer.from('GIF89a......');

const send = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    (obtenerClienteS3 as jest.Mock).mockReturnValue({ send });
});

describe('detectarTipoImagen', () => {
    it('debería reconocer JPG, PNG y WEBP por sus primeros bytes', () => {
        expect(detectarTipoImagen(bufferJpg)?.extension).toBe('jpg');
        expect(detectarTipoImagen(bufferPng)?.extension).toBe('png');
        expect(detectarTipoImagen(bufferWebp)?.extension).toBe('webp');
    });

    it('debería regresar null para un GIF o un archivo de texto', () => {
        expect(detectarTipoImagen(bufferGif)).toBeNull();
        expect(detectarTipoImagen(Buffer.from('hola mundo'))).toBeNull();
    });

    it('debería regresar null si el archivo es demasiado corto', () => {
        expect(detectarTipoImagen(Buffer.from([0xff, 0xd8]))).toBeNull();
    });
});

describe('validarImagen', () => {
    it('debería rechazar un archivo vacío o inexistente', () => {
        expect(() => validarImagen(undefined)).toThrow(ArchivoInvalidoError);
        expect(() => validarImagen(Buffer.alloc(0))).toThrow('El archivo está vacío');
    });

    it('debería rechazar un archivo de más de 15 MB aunque sea JPG', () => {
        // Arrange: JPG válido pero con un byte de más
        const grande = Buffer.alloc(TAMANO_MAXIMO_BYTES + 1);
        bufferJpg.copy(grande);

        // Act + Assert
        expect(() => validarImagen(grande)).toThrow('15 MB');
    });

    it('debería rechazar un PDF renombrado como .jpg (se revisan los bytes, no el nombre)', () => {
        const pdf = Buffer.from('%PDF-1.7 contenido');
        expect(() => validarImagen(pdf)).toThrow('Formato no permitido');
    });

    it('debería devolver el content type correcto para un PNG', () => {
        expect(validarImagen(bufferPng).contentType).toBe('image/png');
    });
});

describe('construirKeyPerfil', () => {
    it('debería armar perfiles/<usuarioId>/<uuid>.<ext>', () => {
        const key = construirKeyPerfil(USUARIO_ID, 'webp');
        expect(key).toMatch(new RegExp(`^perfiles/${USUARIO_ID}/${PATRON_UUID}\\.webp$`));
    });

    it('debería generar una key distinta en cada llamada', () => {
        expect(construirKeyPerfil(USUARIO_ID, 'jpg')).not.toBe(construirKeyPerfil(USUARIO_ID, 'jpg'));
    });

    it('debería rechazar un id que intenta salirse de la carpeta', () => {
        expect(() => construirKeyPerfil('../../otra-carpeta', 'jpg')).toThrow(ArchivoInvalidoError);
    });
});

describe('esKeyDePerfilValida', () => {
    it('debería aceptar una key generada por el servicio', () => {
        expect(esKeyDePerfilValida(construirKeyPerfil(USUARIO_ID, 'png'))).toBe(true);
    });

    it('debería rechazar URLs de Cloudinary, valores vacíos y rutas fuera de perfiles/', () => {
        expect(esKeyDePerfilValida('https://res.cloudinary.com/demo/image/upload/foto.jpg')).toBe(false);
        expect(esKeyDePerfilValida(undefined)).toBe(false);
        expect(esKeyDePerfilValida('')).toBe(false);
        expect(esKeyDePerfilValida(`posts/${USUARIO_ID}/archivo.jpg`)).toBe(false);
    });
});

describe('subirFotoPerfil', () => {
    it('debería subir el buffer al bucket con ContentType y devolver la key', async () => {
        // Arrange
        send.mockResolvedValueOnce({});

        // Act
        const key = await subirFotoPerfil(USUARIO_ID, bufferJpg);

        // Assert
        expect(key).toMatch(new RegExp(`^perfiles/${USUARIO_ID}/${PATRON_UUID}\\.jpg$`));
        expect(send).toHaveBeenCalledTimes(1);

        const comando = send.mock.calls[0][0];
        expect(comando).toBeInstanceOf(PutObjectCommand);
        expect(comando.input).toMatchObject({
            Bucket: BUCKET,
            Key: key,
            Body: bufferJpg,
            ContentType: 'image/jpeg',
        });
    });

    it('no debería llamar a S3 si el archivo no es una imagen permitida', async () => {
        await expect(subirFotoPerfil(USUARIO_ID, bufferGif)).rejects.toBeInstanceOf(ArchivoInvalidoError);
        expect(send).not.toHaveBeenCalled();
    });

    it('debería propagar el error si S3 falla, para que el controlador responda 500', async () => {
        send.mockRejectedValueOnce(new Error('AccessDenied'));
        await expect(subirFotoPerfil(USUARIO_ID, bufferPng)).rejects.toThrow('AccessDenied');
    });
});

describe('generarUrlFirmada', () => {
    it('debería firmar un GetObject del bucket con la duración indicada', async () => {
        // Arrange
        (getSignedUrl as jest.Mock).mockResolvedValueOnce('https://s3.amazonaws.com/firmada');
        const key = construirKeyPerfil(USUARIO_ID, 'jpg');

        // Act
        const url = await generarUrlFirmada(key, 600);

        // Assert
        expect(url).toBe('https://s3.amazonaws.com/firmada');
        const [, comando, opciones] = (getSignedUrl as jest.Mock).mock.calls[0];
        expect(comando).toBeInstanceOf(GetObjectCommand);
        expect(comando.input).toEqual({ Bucket: BUCKET, Key: key });
        expect(opciones).toEqual({ expiresIn: 600 });
    });
});

describe('eliminarObjeto', () => {
    it('debería mandar un DeleteObjectCommand y regresar true', async () => {
        send.mockResolvedValueOnce({});
        const key = construirKeyPerfil(USUARIO_ID, 'jpg');

        await expect(eliminarObjeto(key)).resolves.toBe(true);
        expect(send.mock.calls[0][0]).toBeInstanceOf(DeleteObjectCommand);
        expect(send.mock.calls[0][0].input).toEqual({ Bucket: BUCKET, Key: key });
    });

    it('no debería lanzar error si S3 falla, solo regresar false', async () => {
        const consola = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        send.mockRejectedValueOnce(new Error('timeout'));

        await expect(eliminarObjeto('perfiles/x.jpg')).resolves.toBe(false);
        consola.mockRestore();
    });
});
