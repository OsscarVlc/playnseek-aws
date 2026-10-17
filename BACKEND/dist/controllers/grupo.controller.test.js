"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const grupo_controller_1 = require("./grupo.controller");
const grupo_model_1 = require("../database/mongo/models/grupo.model");
const comunidad_queries_1 = require("../database/dgraph/queries/comunidad.queries");
jest.mock('../database/mongo/models/grupo.model');
jest.mock('../database/dgraph/queries/comunidad.queries');
describe('unirseAGrupo', () => {
    it('debería devolver 404 si el grupo no existe o está inactivo', async () => {
        const req = {
            user: { _id: '123456789012345678901234' },
            params: { id: 'grupoInexistente' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        grupo_model_1.Grupo.findById.mockResolvedValueOnce(null);
        await (0, grupo_controller_1.unirseAGrupo)(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'No se encontro el grupo' });
    });
    it('debería devolver 400 si el usuario ya es miembro del grupo', async () => {
        const miId = '123456789012345678901234';
        const req = {
            user: { _id: miId },
            params: { id: 'grupoId' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        grupo_model_1.Grupo.findById.mockResolvedValueOnce({
            activo: true,
            integrantes: [{ toString: () => miId }], // ya está en la lista
        });
        await (0, grupo_controller_1.unirseAGrupo)(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Ya eres miembro de este grupo' });
    });
    it('debería unir al usuario exitosamente y sincronizar con Dgraph', async () => {
        const miId = '123456789012345678901234';
        const req = {
            user: { _id: miId },
            params: { id: 'grupoId' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const grupoMock = {
            activo: true,
            integrantes: [], // todavía no tiene a nadie
            save: jest.fn().mockResolvedValue(true),
        };
        grupo_model_1.Grupo.findById.mockResolvedValueOnce(grupoMock);
        comunidad_queries_1.agregarMiembroComunidad.mockResolvedValueOnce(undefined);
        await (0, grupo_controller_1.unirseAGrupo)(req, res);
        expect(grupoMock.integrantes).toContain(miId);
        expect(grupoMock.save).toHaveBeenCalled();
        expect(comunidad_queries_1.agregarMiembroComunidad).toHaveBeenCalledWith(miId, 'grupoId');
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Te uniste al grupo exitosamente' }));
    });
});
const grupo_controller_2 = require("./grupo.controller");
const user_types_1 = require("../types/user.types");
const comunidad_queries_2 = require("../database/dgraph/queries/comunidad.queries");
describe('expulsarIntegrante', () => {
    it('debería devolver 401 si quien lo pide no es líder ni admin', async () => {
        const miId = '123456789012345678901234';
        const liderId = '111111111111111111111111';
        const otroId = '987654321098765432109876';
        const req = {
            user: { _id: miId, rol: user_types_1.Roles.USER }, // ni líder ni admin
            params: { id: 'grupoId' },
            body: { usuarioId: otroId },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        grupo_model_1.Grupo.findById.mockResolvedValueOnce({
            activo: true,
            lider_id: { toString: () => liderId },
            integrantes: [{ toString: () => otroId }],
        });
        await (0, grupo_controller_2.expulsarIntegrante)(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Solo el lider del grupo o un administrador pueden expulsar integrantes',
        });
    });
    it('debería permitir expulsar si quien lo pide es admin (aunque no sea el líder)', async () => {
        const adminId = '123456789012345678901234';
        const liderId = '111111111111111111111111';
        const integranteId = '987654321098765432109876';
        const req = {
            user: { _id: adminId, rol: user_types_1.Roles.ADMIN },
            params: { id: 'grupoId' },
            body: { usuarioId: integranteId },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const grupoMock = {
            activo: true,
            lider_id: { toString: () => liderId },
            integrantes: [{ toString: () => integranteId }],
            save: jest.fn().mockResolvedValue(true),
        };
        grupo_model_1.Grupo.findById.mockResolvedValueOnce(grupoMock);
        comunidad_queries_2.quitarMiembroComunidad.mockResolvedValueOnce(undefined);
        await (0, grupo_controller_2.expulsarIntegrante)(req, res);
        expect(grupoMock.integrantes).not.toContain(integranteId);
        expect(comunidad_queries_2.quitarMiembroComunidad).toHaveBeenCalledWith(integranteId, 'grupoId');
        expect(res.json).toHaveBeenCalledWith({ message: 'Integrante expulsado exitosamente' });
    });
    it('debería devolver 400 si se intenta expulsar al propio líder', async () => {
        const liderId = '111111111111111111111111';
        const req = {
            user: { _id: liderId, rol: user_types_1.Roles.USER },
            params: { id: 'grupoId' },
            body: { usuarioId: liderId }, // intenta expulsarse a sí mismo como líder
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        grupo_model_1.Grupo.findById.mockResolvedValueOnce({
            activo: true,
            lider_id: { toString: () => liderId },
            integrantes: [{ toString: () => liderId }],
        });
        await (0, grupo_controller_2.expulsarIntegrante)(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'No se puede expulsar al lider del grupo' });
    });
});
const grupo_controller_3 = require("./grupo.controller");
const mongoose_1 = require("mongoose");
describe('transferirLiderazgo', () => {
    it('debería devolver 403 si quien lo pide no es el líder actual', async () => {
        const miId = '123456789012345678901234';
        const liderRealId = '111111111111111111111111';
        const nuevoLiderId = '987654321098765432109876';
        const req = {
            user: { _id: miId },
            params: { id: 'grupoId' },
            body: { nuevoLiderId },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        grupo_model_1.Grupo.findById.mockResolvedValueOnce({
            activo: true,
            lider_id: { toString: () => liderRealId }, // el líder real es otro, no yo
        });
        await (0, grupo_controller_3.transferirLiderazgo)(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Solo el lider actual puede transferir el liderazgo' });
    });
    it('debería devolver 400 si el nuevo líder no es miembro del grupo', async () => {
        const liderId = '123456789012345678901234';
        const noMiembroId = '987654321098765432109876';
        const req = {
            user: { _id: liderId },
            params: { id: 'grupoId' },
            body: { nuevoLiderId: noMiembroId },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        grupo_model_1.Grupo.findById.mockResolvedValueOnce({
            activo: true,
            lider_id: { toString: () => liderId },
            integrantes: [{ toString: () => liderId }], // noMiembroId no está en la lista
        });
        await (0, grupo_controller_3.transferirLiderazgo)(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'El nuevo lider debe ser miembro del grupo' });
    });
    it('debería transferir el liderazgo exitosamente', async () => {
        const liderId = '123456789012345678901234';
        const nuevoLiderId = '987654321098765432109876';
        const req = {
            user: { _id: liderId },
            params: { id: 'grupoId' },
            body: { nuevoLiderId },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const grupoMock = {
            activo: true,
            lider_id: { toString: () => liderId },
            integrantes: [{ toString: () => liderId }, { toString: () => nuevoLiderId }],
            save: jest.fn().mockResolvedValue(true),
        };
        grupo_model_1.Grupo.findById.mockResolvedValueOnce(grupoMock);
        await (0, grupo_controller_3.transferirLiderazgo)(req, res);
        expect(grupoMock.lider_id).toBeInstanceOf(mongoose_1.Types.ObjectId);
        expect(grupoMock.lider_id.toString()).toBe(nuevoLiderId);
        expect(grupoMock.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Liderazgo transferido exitosamente' }));
    });
});
const grupo_controller_4 = require("./grupo.controller");
describe('salirDeGrupo', () => {
    it('debería devolver 400 si el líder intenta salir sin transferir el liderazgo', async () => {
        const liderId = '123456789012345678901234';
        const req = {
            user: { _id: liderId },
            params: { id: 'grupoId' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        grupo_model_1.Grupo.findById.mockResolvedValueOnce({
            activo: true,
            lider_id: { toString: () => liderId }, // el que intenta salir ES el líder
        });
        await (0, grupo_controller_4.salirDeGrupo)(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: 'El lider debe transferir el liderazgo antes de salir del grupo',
        });
    });
    it('debería devolver 400 si el usuario no es miembro del grupo', async () => {
        const miId = '123456789012345678901234';
        const liderId = '111111111111111111111111';
        const req = {
            user: { _id: miId },
            params: { id: 'grupoId' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        grupo_model_1.Grupo.findById.mockResolvedValueOnce({
            activo: true,
            lider_id: { toString: () => liderId },
            integrantes: [{ toString: () => liderId }], // miId no está en la lista
        });
        await (0, grupo_controller_4.salirDeGrupo)(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'No eres miembro de este grupo' });
    });
    it('debería salir exitosamente y sincronizar con Dgraph', async () => {
        const miId = '123456789012345678901234';
        const liderId = '111111111111111111111111';
        const req = {
            user: { _id: miId },
            params: { id: 'grupoId' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const grupoMock = {
            activo: true,
            lider_id: { toString: () => liderId },
            integrantes: [{ toString: () => liderId }, { toString: () => miId }],
            save: jest.fn().mockResolvedValue(true),
        };
        grupo_model_1.Grupo.findById.mockResolvedValueOnce(grupoMock);
        comunidad_queries_2.quitarMiembroComunidad.mockResolvedValueOnce(undefined);
        await (0, grupo_controller_4.salirDeGrupo)(req, res);
        expect(grupoMock.integrantes).not.toContain(miId);
        expect(comunidad_queries_2.quitarMiembroComunidad).toHaveBeenCalledWith(miId, 'grupoId');
        expect(res.json).toHaveBeenCalledWith({ message: 'Saliste del grupo exitosamente' });
    });
});
