import { Response } from 'express';
import { AuthRequest } from '../types/auth-request';
import { agregarJuegoActivo, cambiarRolUsuario } from './users.controller';
import { User } from '../database/mongo/models/user.model';
import { sincronizarJuegosUsuario } from '../database/dgraph/queries/juego.queries';

jest.mock('../database/mongo/models/user.model');
jest.mock('../database/dgraph/queries/juego.queries');

describe('agregarJuegoActivo', () => {
    it('debería rechazar con 401 si no está autenticado', async () => {
        // Arrange
        const req = {
            user: undefined,
            params: { juegoId: '111111111111111111111111' },
            body: {},
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        // Act
        await agregarJuegoActivo(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'No autenticado' });
    });

    it('debería devolver 404 si el usuario no existe', async () => {
        // Arrange
        const req = {
            user: { _id: 'miId' },
            params: { juegoId: '111111111111111111111111' }, // 24 caracteres hex válidos
            body: { busca_equipo: true },
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        (User.findById as jest.Mock).mockResolvedValueOnce(null);

        // Act
        await agregarJuegoActivo(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Usuario no encontrado' });
    });

    it('debería agregar un juego nuevo a juegos_activos si no lo tenía', async () => {
        // Arrange
        const req = {
            user: { _id: 'miId' },
            params: { juegoId: '111111111111111111111111' }, // 24 caracteres hex válidos
            body: { busca_equipo: true },
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        const usuarioMock: any = {
            _id: 'miId',
            juegos_activos: [], // no tiene ninguno todavía
            juegos_pasados: [],
        };
        usuarioMock.save = jest.fn().mockResolvedValue(usuarioMock);

        (User.findById as jest.Mock).mockResolvedValueOnce(usuarioMock);
        (sincronizarJuegosUsuario as jest.Mock).mockResolvedValueOnce(undefined);

        // Act
        await agregarJuegoActivo(req, res);

        // Assert
        expect(usuarioMock.juegos_activos).toHaveLength(1);
        expect(usuarioMock.juegos_activos[0].busca_equipo).toBe(true);
        expect(usuarioMock.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Juego agregado a activos' }));
    });

    it('debería actualizar busca_equipo si el juego ya estaba en juegos_activos', async () => {
        // Arrange
        const req = {
            user: { _id: 'miId' },
            params: { juegoId: '111111111111111111111111' }, // mismo id que en juegos_activos del mock
            body: { busca_equipo: false },
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        const usuarioMock: any = {
            _id: 'miId',
            juegos_activos: [
                { juego_id: { toString: () => '111111111111111111111111' }, busca_equipo: true, desde: new Date() },
            ],
            juegos_pasados: [],
        };
        usuarioMock.save = jest.fn().mockResolvedValue(usuarioMock);

        (User.findById as jest.Mock).mockResolvedValueOnce(usuarioMock);
        (sincronizarJuegosUsuario as jest.Mock).mockResolvedValueOnce(undefined);

        // Act
        await agregarJuegoActivo(req, res);

        // Assert
        // no se agregó uno nuevo, se actualizó el existente
        expect(usuarioMock.juegos_activos).toHaveLength(1);
        expect(usuarioMock.juegos_activos[0].busca_equipo).toBe(false);
    });
});

function mockFindByIdAndUpdateChain(resultado: any) {
    (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(resultado),
    });
}

describe('cambiarRolUsuario', () => {
    it('debería rechazar con 401 si no está autenticado', async () => {
        // Arrange
        const req = {
            user: undefined,
            params: { id: '111111111111111111111111' },
            body: { rol: 'moderador' },
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        // Act
        await cambiarRolUsuario(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'No autenticado' });
    });

    it('debería rechazar con 400 si el rol no es uno de los válidos', async () => {
        // Arrange
        const req = {
            user: { _id: 'miId' },
            params: { id: '111111111111111111111111' },
            body: { rol: 'superadmin' }, // no existe ese rol
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        // Act
        await cambiarRolUsuario(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Rol inválido' });
    });

    it('debería rechazar con 400 si el admin intenta cambiar su propio rol', async () => {
        // Arrange
        const miId = '111111111111111111111111';
        const req = {
            user: { _id: miId },
            params: { id: miId }, // mismo id que el usuario autenticado
            body: { rol: 'usuario' },
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        // Act
        await cambiarRolUsuario(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'No puedes cambiar tu propio rol' });
    });

    it('debería devolver 404 si el usuario a modificar no existe', async () => {
        // Arrange
        const req = {
            user: { _id: 'miId' },
            params: { id: '222222222222222222222222' },
            body: { rol: 'moderador' },
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        mockFindByIdAndUpdateChain(null);

        // Act
        await cambiarRolUsuario(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Usuario no encontrado' });
    });

    it('debería actualizar el rol exitosamente', async () => {
        // Arrange
        const req = {
            user: { _id: 'miId' },
            params: { id: '222222222222222222222222' },
            body: { rol: 'moderador' },
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        const usuarioActualizadoMock = {
            _id: '222222222222222222222222',
            nombre: 'Ana',
            rol: 'moderador',
        };

        mockFindByIdAndUpdateChain(usuarioActualizadoMock);

        // Act
        await cambiarRolUsuario(req, res);

        // Assert
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
            '222222222222222222222222',
            { rol: 'moderador' },
            { new: true },
        );
        expect(res.json).toHaveBeenCalledWith({
            message: 'Rol actualizado exitosamente',
            usuario: usuarioActualizadoMock,
        });
    });
});
