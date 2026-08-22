import { Response } from 'express';
import { AuthRequest } from '../types/auth-request';
import { enviarSolicitud } from './solicitud.controller';
import { Solicitud } from '../database/mongo/models/solicitud.model';
import { EstadoSolicitud } from '../types/solicitud.types';
import { crearMatchEnDgraph } from '../database/dgraph/queries/match.queries';

jest.mock('../database/mongo/models/solicitud.model');
jest.mock('../database/dgraph/queries/match.queries');

describe('enviarSolicitud', () => {
    it('debería rechazar con 400 si el usuario intenta enviarse una solicitud a sí mismo', async () => {
        const miId = '123456789012345678901234';

        // 1. Simulamos el request: solo necesitamos que tenga req.user y req.body
        const req = {
            user: { _id: miId },
            body: { aUsuario: miId }, // mismo id que el usuario autenticado
        } as unknown as AuthRequest;

        // 2. Simulamos el response: status() y json() son funciones "espía"
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        await enviarSolicitud(req, res);

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
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        // Le decimos al mock: "la primera vez que te llamen (buscar solicitud existente),
        // devolvé un objeto simulando que ya existe una"
        (Solicitud.findOne as jest.Mock).mockResolvedValueOnce({
            _id: 'algunaSolicitudId',
            de_usuario: miId,
            a_usuario: otroId,
            estado: 'pendiente',
        });

        await enviarSolicitud(req, res);

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
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        // Simulamos la solicitud inversa ya existente, con su propio save()
        const solicitudInversaMock = {
            _id: 'solicitudInversaId',
            de_usuario: otroId,
            a_usuario: miId,
            estado: EstadoSolicitud.PENDIENTE,
            save: jest.fn().mockResolvedValue(true),
        };

        (Solicitud.findOne as jest.Mock)
            .mockResolvedValueOnce(null) // primera llamada: no hay nada
            .mockResolvedValueOnce(solicitudInversaMock); // segunda llamada: sí existe

        (crearMatchEnDgraph as jest.Mock).mockResolvedValueOnce('0xabc');

        await enviarSolicitud(req, res);

        expect(solicitudInversaMock.estado).toBe(EstadoSolicitud.ACEPTADA);
        expect(solicitudInversaMock.save).toHaveBeenCalled();
        expect(crearMatchEnDgraph).toHaveBeenCalledWith(miId, otroId);
        expect(res.json).toHaveBeenCalledWith({
            message: '¡Es un match! Ambos se enviaron solicitud mutuamente',
            match: true,
        });
    });
});

import { responderSolicitud } from './solicitud.controller';

describe('responderSolicitud', () => {
    it('debería devolver 404 si la solicitud no existe', async () => {
        const req = {
            user: { _id: '123456789012345678901234' },
            params: { id: 'idInexistente' },
            body: { respuesta: 'aceptar' },
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        (Solicitud.findById as jest.Mock).mockResolvedValueOnce(null);

        await responderSolicitud(req, res);

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
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        (Solicitud.findById as jest.Mock).mockResolvedValueOnce({
            _id: 'algunaSolicitudId',
            de_usuario: otroId,
            a_usuario: otroId, // el destinatario NO es "miId"
            estado: EstadoSolicitud.PENDIENTE,
        });

        await responderSolicitud(req, res);

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
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        const solicitudMock = {
            _id: 'algunaSolicitudId',
            de_usuario: otroId,
            a_usuario: miId,
            estado: EstadoSolicitud.PENDIENTE,
            save: jest.fn().mockResolvedValue(true),
        };

        (Solicitud.findById as jest.Mock).mockResolvedValueOnce(solicitudMock);
        (crearMatchEnDgraph as jest.Mock).mockResolvedValueOnce('0xabc');

        await responderSolicitud(req, res);

        expect(solicitudMock.estado).toBe(EstadoSolicitud.ACEPTADA);
        expect(solicitudMock.save).toHaveBeenCalled();
        expect(crearMatchEnDgraph).toHaveBeenCalledWith(otroId, miId);
        expect(res.json).toHaveBeenCalledWith({ message: '¡Es un match!' });
    });
});

import { cancelarSolicitud } from './solicitud.controller';

describe('cancelarSolicitud', () => {
    it('debería devolver 403 si intento cancelar una solicitud que no envié yo', async () => {
        const miId = '123456789012345678901234';
        const otroId = '987654321098765432109876';

        const req = {
            user: { _id: miId },
            params: { id: 'algunaSolicitudId' },
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        (Solicitud.findById as jest.Mock).mockResolvedValueOnce({
            _id: 'algunaSolicitudId',
            de_usuario: otroId, // la envió otro usuario, no yo
            a_usuario: miId,
            estado: EstadoSolicitud.PENDIENTE,
        });

        await cancelarSolicitud(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'No puedes cancelar una solicitud que no enviaste tú' });
    });

    it('debería devolver 400 si la solicitud ya no está pendiente', async () => {
        const miId = '123456789012345678901234';

        const req = {
            user: { _id: miId },
            params: { id: 'algunaSolicitudId' },
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        (Solicitud.findById as jest.Mock).mockResolvedValueOnce({
            _id: 'algunaSolicitudId',
            de_usuario: miId,
            a_usuario: 'otroId',
            estado: EstadoSolicitud.ACEPTADA, // ya no está pendiente
        });

        await cancelarSolicitud(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Solo se pueden cancelar solicitudes pendientes' });
    });

    it('debería cancelar exitosamente una solicitud pendiente propia', async () => {
        const miId = '123456789012345678901234';

        const req = {
            user: { _id: miId },
            params: { id: 'algunaSolicitudId' },
        } as unknown as AuthRequest;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        const solicitudMock = {
            _id: 'algunaSolicitudId',
            de_usuario: miId,
            a_usuario: 'otroId',
            estado: EstadoSolicitud.PENDIENTE,
            save: jest.fn().mockResolvedValue(true),
        };

        (Solicitud.findById as jest.Mock).mockResolvedValueOnce(solicitudMock);

        await cancelarSolicitud(req, res);

        expect(solicitudMock.estado).toBe(EstadoSolicitud.CANCELADA);
        expect(solicitudMock.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ message: 'Solicitud cancelada exitosamente' });
    });
});
