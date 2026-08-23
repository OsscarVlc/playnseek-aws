import { Response } from 'express';
import { AuthRequest } from '../types/auth-request';
import { obtenerRecomendaciones } from './recomendacion.controller';
import { obtenerRecomendacionesDgraph } from '../database/dgraph/queries/recomendacion.queries';
import { Solicitud } from '../database/mongo/models/solicitud.model';
import { User } from '../database/mongo/models/user.model';

jest.mock('../database/dgraph/queries/recomendacion.queries');

jest.mock('../database/mongo/models/solicitud.model', () => ({
    Solicitud: { find: jest.fn() },
}));

jest.mock('../database/mongo/models/user.model', () => ({
    User: { find: jest.fn() },
}));

// Helper: simula la cadena User.find(...).select(...).lean()
function mockUserFindChain(resultado: any[]) {
    (User.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(resultado),
        }),
    });
}

describe('obtenerRecomendaciones', () => {
    it('debería devolver lista vacía si Dgraph no encuentra candidatos', async () => {
        const req = {
            user: { _id: '123456789012345678901234' },
            query: {},
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        (obtenerRecomendacionesDgraph as jest.Mock).mockResolvedValueOnce([]);
        (Solicitud.find as jest.Mock).mockResolvedValueOnce([]);
        mockUserFindChain([]);

        await obtenerRecomendaciones(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: [] });
    });

    it('debería excluir candidatos con solicitud existente y enriquecer el resto con datos de Mongo', async () => {
        const miId = '123456789012345678901234';

        const req = {
            user: { _id: miId },
            query: {},
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        (obtenerRecomendacionesDgraph as jest.Mock).mockResolvedValueOnce([
            { mongo_id: 'candidatoA', nombre: 'Candidato A' },
            { mongo_id: 'candidatoB', nombre: 'Candidato B' },
        ]);

        (Solicitud.find as jest.Mock).mockResolvedValueOnce([
            { de_usuario: { toString: () => miId }, a_usuario: { toString: () => 'candidatoA' } },
        ]);

        mockUserFindChain([{ _id: 'candidatoB', nombre: 'Candidato B', idiomas: ['español'] }]);

        await obtenerRecomendaciones(req, res);

        expect(res.json).toHaveBeenCalledWith({
            data: [{ mongo_id: 'candidatoB', _id: 'candidatoB', nombre: 'Candidato B', idiomas: ['español'] }],
        });
    });

    it('debería respetar el límite indicado por query param', async () => {
        const miId = '123456789012345678901234';

        const req = {
            user: { _id: miId },
            query: { limite: '1' },
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        (obtenerRecomendacionesDgraph as jest.Mock).mockResolvedValueOnce([
            { mongo_id: 'candidatoA', nombre: 'Candidato A' },
            { mongo_id: 'candidatoB', nombre: 'Candidato B' },
        ]);
        (Solicitud.find as jest.Mock).mockResolvedValueOnce([]);
        mockUserFindChain([{ _id: 'candidatoA', nombre: 'Candidato A' }]);

        await obtenerRecomendaciones(req, res);

        expect(obtenerRecomendacionesDgraph).toHaveBeenCalledWith(miId, 2); // limite(1) * 2
        expect(res.json).toHaveBeenCalledWith({
            data: [{ mongo_id: 'candidatoA', _id: 'candidatoA', nombre: 'Candidato A' }],
        });
    });
});
