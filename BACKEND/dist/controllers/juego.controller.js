"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.previsualizarJuego = previsualizarJuego;
exports.crearJuego = crearJuego;
exports.listarJuegos = listarJuegos;
exports.obtenerJuego = obtenerJuego;
exports.actualizarJuego = actualizarJuego;
exports.eliminarJuego = eliminarJuego;
const juego_services_1 = require("../services/juego.services");
const https_status_1 = require("../types/https-status");
const juego_model_1 = require("../database/mongo/models/juego.model");
const juego_queries_1 = require("../database/dgraph/queries/juego.queries");
async function previsualizarJuego(req, res) {
    try {
        const { nombre } = req.query;
        if (!nombre || typeof nombre !== 'string') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'El parametro nombre es requerido' });
        }
        const resultados = await (0, juego_services_1.buscarJuegoEnRAWG)(nombre);
        return res.json(resultados);
    }
    catch (err) {
        console.log(err);
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: 'Error al buscar el juego' });
    }
}
async function crearJuego(req, res) {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                message: 'No ingresaste un ID',
            });
        }
        else {
            const juegoExistente = await juego_model_1.Juego.findOne({ id_api: id });
            if (juegoExistente) {
                if (juegoExistente.activo) {
                    return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                        message: 'Este juego ya existe',
                    });
                }
                else {
                    // Si el juego existe pero esta inactivo, lo reactivamos
                    juegoExistente.activo = true;
                    const doc = await juegoExistente.save();
                    console.log('Juego reactivado: ' + doc._id);
                    return res.json({
                        message: 'Juego reactivado exitosamente',
                        juego: {
                            _id: doc._id,
                            titulo: doc.titulo,
                            imagen: doc.imagen,
                            generos: doc.generos,
                            plataformas: doc.plataformas,
                            id_api: doc.id_api,
                        },
                    });
                }
            }
            const detalle = await (0, juego_services_1.obtenerDetalleJuegoRAWG)(id);
            const juegoTranformado = (0, juego_services_1.transformarJuegoRAWG)(detalle);
            const newJuego = new juego_model_1.Juego({
                titulo: juegoTranformado.titulo,
                imagen: juegoTranformado.imagen,
                generos: juegoTranformado.generos,
                plataformas: juegoTranformado.plataformas,
                id_api: juegoTranformado.id_api,
            });
            const doc = await newJuego.save();
            console.log('Juego creado: ' + doc._id);
            // Sincronizar con Dgraph (no bloquea el registro si falla) --------------------------------------------------
            try {
                await (0, juego_queries_1.crearJuegoEnDgraph)(doc._id.toString(), doc.titulo);
            }
            catch (err) {
                console.error(`Juego ${doc._id} creado en Mongo pero FALLÓ la sincronización con Dgraph:`, err);
            }
            // -----------------------------------------------------------------------------------------------------------
            res.status(https_status_1.HttpStatus.CREATED).json({
                message: 'Juego creado exitosamente',
                juego: {
                    _id: doc._id,
                    titulo: doc.titulo,
                    imagen: doc.imagen,
                    generos: doc.generos,
                    plataformas: doc.plataformas,
                    id_api: doc.id_api,
                },
            });
        }
    }
    catch (err) {
        console.log(err);
        res.status(https_status_1.HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
    }
}
async function listarJuegos(req, res) {
    const pagina = Number(req.query.pagina) || 1;
    const limite = Number(req.query.limite) || 10;
    const skip = (pagina - 1) * limite;
    try {
        const juegos = await juego_model_1.Juego.find({ activo: true }).skip(skip).limit(limite);
        const totalJuegos = await juego_model_1.Juego.countDocuments({ activo: true });
        res.json({
            data: juegos,
            pagina,
            totalPaginas: Math.ceil(totalJuegos / limite),
            totalJuegos,
        });
    }
    catch (err) {
        console.log(err);
        res.status(https_status_1.HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
    }
}
async function obtenerJuego(req, res) {
    try {
        const { id } = req.params;
        const resultado = await juego_model_1.Juego.findById(id);
        if (!resultado || !resultado.activo) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({
                message: 'No se encontro el juego',
            });
        }
        return res.send(resultado);
    }
    catch (err) {
        console.log(err);
        if (err.name == 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                message: 'Id Invalido',
            });
        }
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
    }
}
async function actualizarJuego(req, res) {
    try {
        const { id } = req.params;
        const { titulo, imagen, generos, plataformas, id_api } = req.body;
        if (id_api !== undefined) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                message: 'No se puede modificar id_api',
            });
        }
        const juegoUpdate = {};
        if (titulo !== undefined)
            juegoUpdate.titulo = titulo;
        if (imagen !== undefined)
            juegoUpdate.imagen = imagen;
        if (generos !== undefined)
            juegoUpdate.generos = generos;
        if (plataformas !== undefined)
            juegoUpdate.plataformas = plataformas;
        const juegoActualizado = await juego_model_1.Juego.findByIdAndUpdate(id, juegoUpdate, { new: true });
        if (!juegoActualizado) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({
                message: 'No se encontro el juego',
            });
        }
        // Actualizar juego en dgraph ---------------------------------------------------------------------------------------------
        if (juegoUpdate.titulo !== undefined) {
            try {
                await (0, juego_queries_1.actualizarJuegoEnDgraph)(id, { nombre_juego: juegoUpdate.titulo });
            }
            catch (err) {
                console.error(`Juego ${id} actualizado en Mongo pero FALLÓ la sincronización con Dgraph:`, err);
            }
        }
        // ------------------------------------------------------------------------------------------------------------------------
        return res.json(juegoActualizado);
    }
    catch (err) {
        console.log(err);
        if (err.name == 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                message: 'Id Invalido',
            });
        }
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
    }
}
async function eliminarJuego(req, res) {
    try {
        const { id } = req.params;
        const juego = await juego_model_1.Juego.findById(id);
        if (!juego) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({
                message: 'No se encontro el juego',
            });
        }
        if (!juego.activo) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                message: 'El juego ya estaba inactivo',
            });
        }
        juego.activo = false;
        const juegoEliminado = await juego.save();
        return res.json({ message: 'Juego eliminado (marcado inactivo) correctamente', juego: juegoEliminado });
    }
    catch (err) {
        console.log(err);
        if (err.name == 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                message: 'Id Invalido',
            });
        }
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
    }
}
