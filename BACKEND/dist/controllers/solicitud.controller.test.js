"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const solicitud_controller_1 = require("./solicitud.controller");
const solicitud_model_1 = require("../database/mongo/models/solicitud.model");
const solicitud_types_1 = require("../types/solicitud.types");
const match_queries_1 = require("../database/dgraph/queries/match.queries");
jest.mock('../database/mongo/models/solicitud.model');
jest.mock('../database/dgraph/queries/match.queries');
describe('enviarSolicitud', () => {
    it('debería rechazar con 400 si el usuario intenta enviarse una solicitud a sí mismo', async () => {
        const miId = '123456789012345678901234';
        // 1. Simulamos el request: solo necesitamos que tenga req.user y req.body
        const req = {
            user: { _id: miId },
            body: { aUsuario: miId }, // mismo id que el usuario autenticado
        };
        // 2. Simulamos el response: status() y json() son funciones "espía"
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        await (0, solicitud_controller_1.enviarSolicitud)(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: 'No puedes enviarte una solicitud a ti mismo',
        });
    });
    it('debería rechazar con 400 si ya existe una solicitud pendiente hacia ese usuario', async () => {
        const miId = '123456789012345678901234';
        const otroId = '987654321098765432109876';
        const req = {
            user: { _id: miId },
            body: { aUsuario: otroId },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        // Le decimos al mock: "la primera vez que te llamen (buscar solicitud existente),
        // devolvé un objeto simulando que ya existe una"
        solicitud_model_1.Solicitud.findOne.mockResolvedValueOnce({
            _id: 'algunaSolicitudId',
            de_usuario: miId,
            a_usuario: otroId,
            estado: 'pendiente',
        });
        await (0, solicitud_controller_1.enviarSolicitud)(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Ya le enviaste una solicitud a este usuario',
        });
    });
    it('debería crear un match automático si la otra persona ya había enviado una solicitud pendiente', async () => {
        const miId = '123456789012345678901234';
        const otroId = '987654321098765432109876';
        const req = {
            user: { _id: miId },
            body: { aUsuario: otroId },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        // Simulamos la solicitud inversa ya existente, con su propio save()
        const solicitudInversaMock = {
            _id: 'solicitudInversaId',
            de_usuario: otroId,
            a_usuario: miId,
            estado: solicitud_types_1.EstadoSolicitud.PENDIENTE,
            save: jest.fn().mockResolvedValue(true),
        };
        solicitud_model_1.Solicitud.findOne
            .mockResolvedValueOnce(null) // primera llamada: no hay nada
            .mockResolvedValueOnce(solicitudInversaMock); // segunda llamada: sí existe
        match_queries_1.crearMatchEnDgraph.mockResolvedValueOnce('0xabc');
        await (0, solicitud_controller_1.enviarSolicitud)(req, res);
        expect(solicitudInversaMock.estado).toBe(solicitud_types_1.EstadoSolicitud.ACEPTADA);
        expect(solicitudInversaMock.save).toHaveBeenCalled();
        expect(match_queries_1.crearMatchEnDgraph).toHaveBeenCalledWith(miId, otroId);
        expect(res.json).toHaveBeenCalledWith({
            message: '¡Es un match! Ambos se enviaron solicitud mutuamente',
            match: true,
        });
    });
});
const solicitud_controller_2 = require("./solicitud.controller");
describe('responderSolicitud', () => {
    it('debería devolver 404 si la solicitud no existe', async () => {
        const req = {
            user: { _id: '123456789012345678901234' },
            params: { id: 'idInexistente' },
            body: { respuesta: 'aceptar' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        solicitud_model_1.Solicitud.findById.mockResolvedValueOnce(null);
        await (0, solicitud_controller_2.responderSolicitud)(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'No se encontro la solicitud' });
    });
    it('debería devolver 403 si el usuario no es el destinatario de la solicitud', async () => {
        const miId = '123456789012345678901234';
        const otroId = '987654321098765432109876';
        const req = {
            user: { _id: miId },
            params: { id: 'algunaSolicitudId' },
            body: { respuesta: 'aceptar' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        solicitud_model_1.Solicitud.findById.mockResolvedValueOnce({
            _id: 'algunaSolicitudId',
            de_usuario: otroId,
            a_usuario: otroId, // el destinatario NO es "miId"
            estado: solicitud_types_1.EstadoSolicitud.PENDIENTE,
        });
        await (0, solicitud_controller_2.responderSolicitud)(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'No puedes responder una solicitud que no es tuya' });
    });
    it('debería aceptar la solicitud y crear el match en Dgraph', async () => {
        const miId = '123456789012345678901234';
        const otroId = '987654321098765432109876';
        const req = {
            user: { _id: miId },
            params: { id: 'algunaSolicitudId' },
            body: { respuesta: 'aceptar' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const solicitudMock = {
            _id: 'algunaSolicitudId',
            de_usuario: otroId,
            a_usuario: miId,
            estado: solicitud_types_1.EstadoSolicitud.PENDIENTE,
            save: jest.fn().mockResolvedValue(true),
        };
        solicitud_model_1.Solicitud.findById.mockResolvedValueOnce(solicitudMock);
        match_queries_1.crearMatchEnDgraph.mockResolvedValueOnce('0xabc');
        await (0, solicitud_controller_2.responderSolicitud)(req, res);
        expect(solicitudMock.estado).toBe(solicitud_types_1.EstadoSolicitud.ACEPTADA);
        expect(solicitudMock.save).toHaveBeenCalled();
        expect(match_queries_1.crearMatchEnDgraph).toHaveBeenCalledWith(otroId, miId);
        expect(res.json).toHaveBeenCalledWith({ message: '¡Es un match!' });
    });
});
const solicitud_controller_3 = require("./solicitud.controller");
describe('cancelarSolicitud', () => {
    it('debería devolver 403 si intento cancelar una solicitud que no envié yo', async () => {
        const miId = '123456789012345678901234';
        const otroId = '987654321098765432109876';
        const req = {
            user: { _id: miId },
            params: { id: 'algunaSolicitudId' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        solicitud_model_1.Solicitud.findById.mockResolvedValueOnce({
            _id: 'algunaSolicitudId',
            de_usuario: otroId, // la envió otro usuario, no yo
            a_usuario: miId,
            estado: solicitud_types_1.EstadoSolicitud.PENDIENTE,
        });
        await (0, solicitud_controller_3.cancelarSolicitud)(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'No puedes cancelar una solicitud que no enviaste tú' });
    });
    it('debería devolver 400 si la solicitud ya no está pendiente', async () => {
        const miId = '123456789012345678901234';
        const req = {
            user: { _id: miId },
            params: { id: 'algunaSolicitudId' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        solicitud_model_1.Solicitud.findById.mockResolvedValueOnce({
            _id: 'algunaSolicitudId',
            de_usuario: miId,
            a_usuario: 'otroId',
            estado: solicitud_types_1.EstadoSolicitud.ACEPTADA, // ya no está pendiente
        });
        await (0, solicitud_controller_3.cancelarSolicitud)(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Solo se pueden cancelar solicitudes pendientes' });
    });
    it('debería cancelar exitosamente una solicitud pendiente propia', async () => {
        const miId = '123456789012345678901234';
        const req = {
            user: { _id: miId },
            params: { id: 'algunaSolicitudId' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const solicitudMock = {
            _id: 'algunaSolicitudId',
            de_usuario: miId,
            a_usuario: 'otroId',
            estado: solicitud_types_1.EstadoSolicitud.PENDIENTE,
            save: jest.fn().mockResolvedValue(true),
        };
        solicitud_model_1.Solicitud.findById.mockResolvedValueOnce(solicitudMock);
        await (0, solicitud_controller_3.cancelarSolicitud)(req, res);
        expect(solicitudMock.estado).toBe(solicitud_types_1.EstadoSolicitud.CANCELADA);
        expect(solicitudMock.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ message: 'Solicitud cancelada exitosamente' });
    });
});
