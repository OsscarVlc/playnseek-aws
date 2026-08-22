import { Response } from 'express';
import { AuthRequest } from '../types/auth-request';
import { listarPosts } from './post.controller';
import { Post } from '../database/mongo/models/post.model';
import { Grupo } from '../database/mongo/models/grupo.model';

jest.mock('../database/mongo/models/post.model');
jest.mock('../database/mongo/models/grupo.model');

// Helper: simula la cadena Post.find(...).skip(...).limit(...)
function mockPostFindChain(resultado: any[]) {
    (Post.find as jest.Mock).mockReturnValue({
        skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(resultado),
        }),
    });
}

describe('listarPosts', () => {

    it('debería rechazar con 401 si filtra por grupo_id sin estar autenticado', async () => {

        // Arrange
        const req = {
            user: undefined,
            query: { grupo_id: '111111111111111111111111' }
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        // Act
        await listarPosts(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Debes iniciar sesión para ver los posts de un grupo' });
    });

    it('debería devolver 404 si el grupo no existe o está inactivo', async () => {

        // Arrange
        const req = {
            user: { _id: 'miId', rol: 'usuario' },
            query: { grupo_id: '111111111111111111111111' }
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        (Grupo.findById as jest.Mock).mockResolvedValueOnce(null);

        // Act
        await listarPosts(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Grupo no encontrado' });
    });

    it('debería rechazar con 403 si no es integrante ni admin', async () => {

        // Arrange
        const req = {
            user: { _id: 'miId', rol: 'usuario' },
            query: { grupo_id: '111111111111111111111111' }
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        (Grupo.findById as jest.Mock).mockResolvedValueOnce({
            activo: true,
            integrantes: [{ toString: () => 'otroUsuarioId' }] // no incluye a "miId"
        });

        // Act
        await listarPosts(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Debes ser integrante del grupo para ver sus posts' });
    });

    it('debería permitir ver los posts si es integrante del grupo', async () => {

        // Arrange
        const req = {
            user: { _id: 'miId', rol: 'usuario' },
            query: { grupo_id: '111111111111111111111111' }
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        (Grupo.findById as jest.Mock).mockResolvedValueOnce({
            activo: true,
            integrantes: [{ toString: () => 'miId' }] // sí incluye a "miId"
        });

        mockPostFindChain([{ contenido: 'Hola grupo' }]);
        (Post.countDocuments as jest.Mock).mockResolvedValueOnce(1);

        // Act
        await listarPosts(req, res);

        // Assert
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ data: [{ contenido: 'Hola grupo' }], total: 1 })
        );
    });

    it('debería permitir ver los posts si es admin, aunque no sea integrante', async () => {

        // Arrange
        const req = {
            user: { _id: 'adminId', rol: 'administrador' },
            query: { grupo_id: '111111111111111111111111' }
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        (Grupo.findById as jest.Mock).mockResolvedValueOnce({
            activo: true,
            integrantes: [{ toString: () => 'otroUsuarioId' }] // adminId NO está en la lista
        });

        mockPostFindChain([]);
        (Post.countDocuments as jest.Mock).mockResolvedValueOnce(0);

        // Act
        await listarPosts(req, res);

        // Assert
        // el admin pasa aunque no sea integrante
        expect(res.status).not.toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [] }));
    });

});