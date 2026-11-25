import { Request, Response } from 'express';
import { redirigirFotoPerfil, DURACION_URL_SEGUNDOS } from './media.controller';
import { generarUrlFirmada } from '../services/s3.service';

// Se mockea solo la firma; esKeyDePerfilValida se usa real para probar la validación de la ruta.
jest.mock('../services/s3.service', () => ({
    ...jest.requireActual('../services/s3.service'),
    generarUrlFirmada: jest.fn(),
}));

const USUARIO_ID = '64b7f0c2a1b2c3d4e5f60718';
const ARCHIVO = '3f1c2a9e-1b2c-4d5e-8f90-123456789abc.jpg';

function crearRes() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn(),
        redirect: jest.fn(),
    } as unknown as Response;
}

beforeEach(() => jest.clearAllMocks());

describe('redirigirFotoPerfil', () => {
    it('debería redirigir con 302 a la URL prefirmada', async () => {
        // Arrange
        (generarUrlFirmada as jest.Mock).mockResolvedValueOnce('https://s3/firmada');
        const req = { params: { usuarioId: USUARIO_ID, archivo: ARCHIVO } } as unknown as Request;
        const res = crearRes();

        // Act
        await redirigirFotoPerfil(req, res);

        // Assert
        expect(generarUrlFirmada).toHaveBeenCalledWith(`perfiles/${USUARIO_ID}/${ARCHIVO}`, DURACION_URL_SEGUNDOS);
        expect(res.redirect).toHaveBeenCalledWith(302, 'https://s3/firmada');
        expect(res.set).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('max-age='));
    });

    it('debería responder 404 sin firmar nada si el archivo no tiene el formato esperado', async () => {
        const req = { params: { usuarioId: USUARIO_ID, archivo: '..%2F..%2Fsecreto.txt' } } as unknown as Request;
        const res = crearRes();

        await redirigirFotoPerfil(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(generarUrlFirmada).not.toHaveBeenCalled();
    });

    it('debería responder 500 si no se pudo firmar la URL', async () => {
        const consola = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        (generarUrlFirmada as jest.Mock).mockRejectedValueOnce(new Error('sin credenciales'));
        const req = { params: { usuarioId: USUARIO_ID, archivo: ARCHIVO } } as unknown as Request;
        const res = crearRes();

        await redirigirFotoPerfil(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        consola.mockRestore();
    });
});
