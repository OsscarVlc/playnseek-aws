"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enviarSolicitud = enviarSolicitud;
exports.listarSolicitudesRecibidas = listarSolicitudesRecibidas;
exports.responderSolicitud = responderSolicitud;
exports.listarSolicitudesEnviadas = listarSolicitudesEnviadas;
exports.cancelarSolicitud = cancelarSolicitud;
const https_status_1 = require("../types/https-status");
const solicitud_model_1 = require("../database/mongo/models/solicitud.model");
const solicitud_types_1 = require("../types/solicitud.types");
const match_queries_1 = require("../database/dgraph/queries/match.queries");
async function enviarSolicitud(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const deUsuario = req.user._id.toString();
        const { aUsuario } = req.body;
        if (!aUsuario) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'aUsuario es requerido' });
        }
        if (aUsuario === deUsuario) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'No puedes enviarte una solicitud a ti mismo' });
        }
        // ¿Ya le mandé una solicitud pendiente a esta persona?
        const solicitudExistente = await solicitud_model_1.Solicitud.findOne({
            de_usuario: deUsuario,
            a_usuario: aUsuario,
            estado: solicitud_types_1.EstadoSolicitud.PENDIENTE
        });
        if (solicitudExistente) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Ya le enviaste una solicitud a este usuario' });
        }
        // ¿Esta persona ya me mandó una solicitud pendiente a mí? -> auto-match mutuo
        const solicitudInversa = await solicitud_model_1.Solicitud.findOne({
            de_usuario: aUsuario,
            a_usuario: deUsuario,
            estado: solicitud_types_1.EstadoSolicitud.PENDIENTE
        });
        if (solicitudInversa) {
            solicitudInversa.estado = solicitud_types_1.EstadoSolicitud.ACEPTADA;
            solicitudInversa.fecha_respuesta = new Date();
            await solicitudInversa.save();
            try {
                await (0, match_queries_1.crearMatchEnDgraph)(deUsuario, aUsuario);
            }
            catch (err) {
                console.error(`Match auto-aceptado en Mongo pero FALLÓ la sincronización con Dgraph:`, err);
            }
            return res.json({ message: '¡Es un match! Ambos se enviaron solicitud mutuamente', match: true });
        }
        // No hay nada pendiente entre ambos: creamos la solicitud nueva
        const nuevaSolicitud = new solicitud_model_1.Solicitud({
            de_usuario: deUsuario,
            a_usuario: aUsuario,
        });
        const doc = await nuevaSolicitud.save();
        console.log('Solicitud creada: ' + doc._id);
        return res.status(https_status_1.HttpStatus.CREATED).json({ message: 'Solicitud enviada exitosamente', solicitud: doc });
    }
    catch (err) {
        console.log(err);
        if (err.name === 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: "Error del servidor" });
    }
}
async function listarSolicitudesRecibidas(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const solicitudes = await solicitud_model_1.Solicitud.find({
            a_usuario: req.user._id,
            estado: solicitud_types_1.EstadoSolicitud.PENDIENTE
        }).populate('de_usuario', 'nombre foto_perfil idiomas plataformas');
        return res.json({ data: solicitudes });
    }
    catch (err) {
        console.log(err);
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: "Error del servidor" });
    }
}
async function responderSolicitud(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const { id } = req.params; // id de la solicitud
        const { respuesta } = req.body; // "aceptar" o "rechazar"
        if (respuesta !== 'aceptar' && respuesta !== 'rechazar') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'respuesta debe ser "aceptar" o "rechazar"' });
        }
        const solicitud = await solicitud_model_1.Solicitud.findById(id);
        if (!solicitud) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: 'No se encontro la solicitud' });
        }
        if (solicitud.a_usuario.toString() !== req.user._id.toString()) {
            return res.status(https_status_1.HttpStatus.FORBIDDEN).json({ message: 'No puedes responder una solicitud que no es tuya' });
        }
        if (solicitud.estado !== solicitud_types_1.EstadoSolicitud.PENDIENTE) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Esta solicitud ya fue respondida' });
        }
        solicitud.estado = respuesta === 'aceptar' ? solicitud_types_1.EstadoSolicitud.ACEPTADA : solicitud_types_1.EstadoSolicitud.RECHAZADA;
        solicitud.fecha_respuesta = new Date();
        await solicitud.save();
        if (respuesta === 'aceptar') {
            try {
                await (0, match_queries_1.crearMatchEnDgraph)(solicitud.de_usuario.toString(), solicitud.a_usuario.toString());
            }
            catch (err) {
                console.error(`Match aceptado en Mongo pero FALLÓ la sincronización con Dgraph:`, err);
            }
            return res.json({ message: '¡Es un match!' });
        }
        return res.json({ message: 'Solicitud rechazada' });
    }
    catch (err) {
        console.log(err);
        if (err.name === 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: "Error del servidor" });
    }
}
async function listarSolicitudesEnviadas(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const solicitudes = await solicitud_model_1.Solicitud.find({
            de_usuario: req.user._id
        }).populate('a_usuario', 'nombre foto_perfil');
        return res.json({ data: solicitudes });
    }
    catch (err) {
        console.log(err);
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: "Error del servidor" });
    }
}
async function cancelarSolicitud(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const usuarioId = req.user._id.toString();
        const solicitud = await solicitud_model_1.Solicitud.findById(id);
        if (!solicitud) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: 'No se encontro la solicitud' });
        }
        if (solicitud.de_usuario.toString() !== usuarioId) {
            return res.status(https_status_1.HttpStatus.FORBIDDEN).json({ message: 'No puedes cancelar una solicitud que no enviaste tú' });
        }
        if (solicitud.estado !== solicitud_types_1.EstadoSolicitud.PENDIENTE) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Solo se pueden cancelar solicitudes pendientes' });
        }
        solicitud.estado = solicitud_types_1.EstadoSolicitud.CANCELADA;
        solicitud.fecha_respuesta = new Date();
        await solicitud.save();
        return res.json({ message: 'Solicitud cancelada exitosamente' });
    }
    catch (err) {
        console.log(err);
        if (err.name === 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: "Error del servidor" });
    }
}
