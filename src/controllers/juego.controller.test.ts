import { Request, Response } from 'express';
import { crearJuego } from './juego.controller';
import { Juego } from '../database/mongo/models/juego.model';
import { transformarJuegoRAWG, obtenerDetalleJuegoRAWG } from '../services/juego.services';

jest.mock('../database/mongo/models/juego.model');
jest.mock('../services/juego.services');
jest.mock('../database/dgraph/queries/juego.queries');





describe('crearJuego', () => {

    it('deberia rechazar con 400 si no se manda ningun id', async () => {
        const req = { body: {} } as unknown as Request;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        await crearJuego(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'No ingresaste un ID' });
    });

    it('deberia rechazar con 400 si el juego ya existe y esta activo', async () => {
        const req = { body: { id: 415171 } } as unknown as Request;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        (Juego.findOne as jest.Mock).mockResolvedValueOnce({
            activo: true,
            id_api: 415171
        });

        await crearJuego(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Este juego ya existe' });
    });

    it('deberia reactivar el juego si existe pero esta inactivo', async () => {
        const req = { body: { id: 415171 } } as unknown as Request;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        const juegoInactivoMock: any = {
            activo: false,
            _id: 'algunId',
            titulo: 'Valorant',
            imagen: 'url',
            generos: ['Shooter'],
            plataformas: ['pc'],
            id_api: 415171,
        };
        juegoInactivoMock.save = jest.fn().mockResolvedValue(juegoInactivoMock);

        (Juego.findOne as jest.Mock).mockResolvedValueOnce(juegoInactivoMock);

        await crearJuego(req, res);

        expect(juegoInactivoMock.activo).toBe(true);
        expect(juegoInactivoMock.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Juego reactivado exitosamente' })
        );
    });

    it('deberia crear un juego nuevo si no existe ningun documento con ese id_api', async () => {
        const req = { body: { id: 415171 } } as unknown as Request;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        (Juego.findOne as jest.Mock).mockResolvedValueOnce(null);

        (obtenerDetalleJuegoRAWG as jest.Mock).mockResolvedValueOnce({
            name: 'Valorant',
            background_image: 'url',
            id: 415171,
            genres: [],
            platforms: []
        });

        (transformarJuegoRAWG as jest.Mock).mockReturnValueOnce({
            titulo: 'Valorant',
            imagen: 'url',
            generos: [],
            plataformas: [],
            id_api: 415171
        });

        const nuevoJuegoMock: any = {
            _id: 'nuevoId',
            titulo: 'Valorant',
            imagen: 'url',
            generos: [],
            plataformas: [],
            id_api: 415171,
        };
        nuevoJuegoMock.save = jest.fn().mockResolvedValue(nuevoJuegoMock);

        (Juego as unknown as jest.Mock).mockImplementationOnce(() => nuevoJuegoMock);

        await crearJuego(req, res);

        expect(obtenerDetalleJuegoRAWG).toHaveBeenCalledWith(415171);
        expect(nuevoJuegoMock.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Juego creado exitosamente' })
        );
    });

});