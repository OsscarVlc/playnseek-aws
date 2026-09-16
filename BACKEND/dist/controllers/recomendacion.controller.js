"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.obtenerRecomendaciones = obtenerRecomendaciones;
const https_status_1 = require("../types/https-status");
const solicitud_model_1 = require("../database/mongo/models/solicitud.model");
const solicitud_types_1 = require("../types/solicitud.types");
const recomendacion_queries_1 = require("../database/dgraph/queries/recomendacion.queries");
const user_model_1 = require("../database/mongo/models/user.model");
async function obtenerRecomendaciones(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const mongoId = req.user._id.toString();
        const limite = Number(req.query.limite) || 20;
        // Pedimos de más a Dgraph, por si hay que descartar algunos por solicitudes ya existentes
        const candidatosDgraph = await (0, recomendacion_queries_1.obtenerRecomendacionesDgraph)(mongoId, limite * 2);
        const idsCandidatos = candidatosDgraph.map(c => c.mongo_id);
        // Buscamos si ya existe una solicitud pendiente o aceptada entre el usuario y estos candidatos
        // (una rechazada NO excluye: puede volver a aparecer)
        const solicitudesExistentes = await solicitud_model_1.Solicitud.find({
            estado: { $in: [solicitud_types_1.EstadoSolicitud.PENDIENTE, solicitud_types_1.EstadoSolicitud.ACEPTADA] },
            $or: [
                { de_usuario: mongoId, a_usuario: { $in: idsCandidatos } },
                { a_usuario: mongoId, de_usuario: { $in: idsCandidatos } }
            ]
        });
        const idsExcluir = new Set(solicitudesExistentes.map(s => s.de_usuario.toString() === mongoId ? s.a_usuario.toString() : s.de_usuario.toString()));
        const candidatosFiltrados = candidatosDgraph
            .filter(c => !idsExcluir.has(c.mongo_id))
            .slice(0, limite);
        // enriquecemos con datos reales de mongo (dgraph solo nos dio mongo_id y nombre)
        const idsFinales = candidatosFiltrados.map(c => c.mongo_id);
        const perfiles = await user_model_1.User.find({ _id: { $in: idsFinales } })
            .select('nombre foto_perfil idiomas plataformas modo_juego')
            .lean();
        const perfilesPorId = new Map(perfiles.map(p => [p._id.toString(), p]));
        const recomendaciones = candidatosFiltrados
            .filter(c => perfilesPorId.has(c.mongo_id))
            .map(c => ({
            mongo_id: c.mongo_id,
            ...perfilesPorId.get(c.mongo_id)
        }));
        return res.json({ data: recomendaciones });
    }
    catch (err) {
        console.log(err);
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: "Error del servidor" });
    }
}
