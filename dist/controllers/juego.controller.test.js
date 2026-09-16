"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const juego_controller_1 = require("./juego.controller");
const juego_model_1 = require("../database/mongo/models/juego.model");
const juego_services_1 = require("../services/juego.services");
jest.mock('../database/mongo/models/juego.model');
jest.mock('../services/juego.services');
jest.mock('../database/dgraph/queries/juego.queries');
describe('crearJuego', () => {
    it('deberia rechazar con 400 si no se manda ningun id', async () => {
        const req = { body: {} };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        await (0, juego_controller_1.crearJuego)(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'No ingresaste un ID' });
    });
    it('deberia rechazar con 400 si el juego ya existe y esta activo', async () => {
        const req = { body: { id: 415171 } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        juego_model_1.Juego.findOne.mockResolvedValueOnce({
            activo: true,
            id_api: 415171,
        });
        await (0, juego_controller_1.crearJuego)(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Este juego ya existe' });
    });
    it('deberia reactivar el juego si existe pero esta inactivo', async () => {
        const req = { body: { id: 415171 } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const juegoInactivoMock = {
            activo: false,
            _id: 'algunId',
            titulo: 'Valorant',
            imagen: 'url',
            generos: ['Shooter'],
            plataformas: ['pc'],
            id_api: 415171,
        };
        juegoInactivoMock.save = jest.fn().mockResolvedValue(juegoInactivoMock);
        juego_model_1.Juego.findOne.mockResolvedValueOnce(juegoInactivoMock);
        await (0, juego_controller_1.crearJuego)(req, res);
        expect(juegoInactivoMock.activo).toBe(true);
        expect(juegoInactivoMock.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Juego reactivado exitosamente' }));
    });
    it('deberia crear un juego nuevo si no existe ningun documento con ese id_api', async () => {
        const req = { body: { id: 415171 } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        juego_model_1.Juego.findOne.mockResolvedValueOnce(null);
        juego_services_1.obtenerDetalleJuegoRAWG.mockResolvedValueOnce({
            name: 'Valorant',
            background_image: 'url',
            id: 415171,
            genres: [],
            platforms: [],
        });
        juego_services_1.transformarJuegoRAWG.mockReturnValueOnce({
            titulo: 'Valorant',
            imagen: 'url',
            generos: [],
            plataformas: [],
            id_api: 415171,
        });
        const nuevoJuegoMock = {
            _id: 'nuevoId',
            titulo: 'Valorant',
            imagen: 'url',
            generos: [],
            plataformas: [],
            id_api: 415171,
        };
        nuevoJuegoMock.save = jest.fn().mockResolvedValue(nuevoJuegoMock);
        juego_model_1.Juego.mockImplementationOnce(() => nuevoJuegoMock);
        await (0, juego_controller_1.crearJuego)(req, res);
        expect(juego_services_1.obtenerDetalleJuegoRAWG).toHaveBeenCalledWith(415171);
        expect(nuevoJuegoMock.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Juego creado exitosamente' }));
    });
});
