"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const recomendacion_controller_1 = require("./recomendacion.controller");
const recomendacion_queries_1 = require("../database/dgraph/queries/recomendacion.queries");
const solicitud_model_1 = require("../database/mongo/models/solicitud.model");
const user_model_1 = require("../database/mongo/models/user.model");
const NOMBRE_CANDIDATO_A = 'Candidato A';
const NOMBRE_CANDIDATO_B = 'Candidato B';
jest.mock('../database/dgraph/queries/recomendacion.queries');
jest.mock('../database/mongo/models/solicitud.model', () => ({
    Solicitud: { find: jest.fn() },
}));
jest.mock('../database/mongo/models/user.model', () => ({
    User: { find: jest.fn() },
}));
// Helper: simula la cadena User.find(...).select(...).lean()
function mockUserFindChain(resultado) {
    user_model_1.User.find.mockReturnValue({
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
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        recomendacion_queries_1.obtenerRecomendacionesDgraph.mockResolvedValueOnce([]);
        solicitud_model_1.Solicitud.find.mockResolvedValueOnce([]);
        mockUserFindChain([]);
        await (0, recomendacion_controller_1.obtenerRecomendaciones)(req, res);
        expect(res.json).toHaveBeenCalledWith({ data: [] });
    });
    it('debería excluir candidatos con solicitud existente y enriquecer el resto con datos de Mongo', async () => {
        const miId = '123456789012345678901234';
        const req = {
            user: { _id: miId },
            query: {},
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        recomendacion_queries_1.obtenerRecomendacionesDgraph.mockResolvedValueOnce([
            { mongo_id: 'candidatoA', nombre: NOMBRE_CANDIDATO_A },
            { mongo_id: 'candidatoB', nombre: NOMBRE_CANDIDATO_B },
        ]);
        solicitud_model_1.Solicitud.find.mockResolvedValueOnce([
            { de_usuario: { toString: () => miId }, a_usuario: { toString: () => 'candidatoA' } },
        ]);
        mockUserFindChain([{ _id: 'candidatoB', nombre: NOMBRE_CANDIDATO_B, idiomas: ['español'] }]);
        await (0, recomendacion_controller_1.obtenerRecomendaciones)(req, res);
        expect(res.json).toHaveBeenCalledWith({
            data: [{ mongo_id: 'candidatoB', _id: 'candidatoB', nombre: NOMBRE_CANDIDATO_B, idiomas: ['español'] }],
        });
    });
    it('debería respetar el límite indicado por query param', async () => {
        const miId = '123456789012345678901234';
        const req = {
            user: { _id: miId },
            query: { limite: '1' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        recomendacion_queries_1.obtenerRecomendacionesDgraph.mockResolvedValueOnce([
            { mongo_id: 'candidatoA', nombre: NOMBRE_CANDIDATO_A },
            { mongo_id: 'candidatoB', nombre: NOMBRE_CANDIDATO_B },
        ]);
        solicitud_model_1.Solicitud.find.mockResolvedValueOnce([]);
        mockUserFindChain([{ _id: 'candidatoA', nombre: NOMBRE_CANDIDATO_A }]);
        await (0, recomendacion_controller_1.obtenerRecomendaciones)(req, res);
        expect(recomendacion_queries_1.obtenerRecomendacionesDgraph).toHaveBeenCalledWith(miId, 2); // limite(1) * 2
        expect(res.json).toHaveBeenCalledWith({
            data: [{ mongo_id: 'candidatoA', _id: 'candidatoA', nombre: NOMBRE_CANDIDATO_A }],
        });
    });
});
