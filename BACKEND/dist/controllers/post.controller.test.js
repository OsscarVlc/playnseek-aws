"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const post_controller_1 = require("./post.controller");
const post_model_1 = require("../database/mongo/models/post.model");
const grupo_model_1 = require("../database/mongo/models/grupo.model");
jest.mock('../database/mongo/models/post.model');
jest.mock('../database/mongo/models/grupo.model');
// Helper: simula la cadena Post.find(...).skip(...).limit(...)
function mockPostFindChain(resultado) {
    post_model_1.Post.find.mockReturnValue({
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
            query: { grupo_id: '111111111111111111111111' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        // Act
        await (0, post_controller_1.listarPosts)(req, res);
        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Debes iniciar sesión para ver los posts de un grupo' });
    });
    it('debería devolver 404 si el grupo no existe o está inactivo', async () => {
        // Arrange
        const req = {
            user: { _id: 'miId', rol: 'usuario' },
            query: { grupo_id: '111111111111111111111111' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        grupo_model_1.Grupo.findById.mockResolvedValueOnce(null);
        // Act
        await (0, post_controller_1.listarPosts)(req, res);
        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Grupo no encontrado' });
    });
    it('debería rechazar con 403 si no es integrante ni admin', async () => {
        // Arrange
        const req = {
            user: { _id: 'miId', rol: 'usuario' },
            query: { grupo_id: '111111111111111111111111' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        grupo_model_1.Grupo.findById.mockResolvedValueOnce({
            activo: true,
            integrantes: [{ toString: () => 'otroUsuarioId' }], // no incluye a "miId"
        });
        // Act
        await (0, post_controller_1.listarPosts)(req, res);
        // Assert
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Debes ser integrante del grupo para ver sus posts' });
    });
    it('debería permitir ver los posts si es integrante del grupo', async () => {
        // Arrange
        const req = {
            user: { _id: 'miId', rol: 'usuario' },
            query: { grupo_id: '111111111111111111111111' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        grupo_model_1.Grupo.findById.mockResolvedValueOnce({
            activo: true,
            integrantes: [{ toString: () => 'miId' }], // sí incluye a "miId"
        });
        mockPostFindChain([{ contenido: 'Hola grupo' }]);
        post_model_1.Post.countDocuments.mockResolvedValueOnce(1);
        // Act
        await (0, post_controller_1.listarPosts)(req, res);
        // Assert
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [{ contenido: 'Hola grupo' }], total: 1 }));
    });
    it('debería permitir ver los posts si es admin, aunque no sea integrante', async () => {
        // Arrange
        const req = {
            user: { _id: 'adminId', rol: 'administrador' },
            query: { grupo_id: '111111111111111111111111' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        grupo_model_1.Grupo.findById.mockResolvedValueOnce({
            activo: true,
            integrantes: [{ toString: () => 'otroUsuarioId' }], // adminId NO está en la lista
        });
        mockPostFindChain([]);
        post_model_1.Post.countDocuments.mockResolvedValueOnce(0);
        // Act
        await (0, post_controller_1.listarPosts)(req, res);
        // Assert
        // el admin pasa aunque no sea integrante
        expect(res.status).not.toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [] }));
    });
});
