"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarMisMatches = listarMisMatches;
const https_status_1 = require("../types/https-status");
const match_queries_1 = require("../database/dgraph/queries/match.queries");
const user_model_1 = require("../database/mongo/models/user.model");
async function listarMisMatches(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const mongoId = req.user._id.toString();
        const matches = await (0, match_queries_1.obtenerMatchesDeUsuario)(mongoId);
        // dgraph solo nos da mongo_id y nombre del compañero, traemos foto_perfil desde mongo
        const idsCompaneros = matches.map(m => m.companero.mongo_id);
        const perfiles = await user_model_1.User.find({ _id: { $in: idsCompaneros } })
            .select('foto_perfil')
            .lean();
        const fotosPorId = new Map(perfiles.map(p => [p._id.toString(), p.foto_perfil]));
        const matchesEnriquecidos = matches.map(m => ({
            fecha: m.fecha,
            companero: {
                mongo_id: m.companero.mongo_id,
                nombre: m.companero.nombre,
                foto_perfil: fotosPorId.get(m.companero.mongo_id)
            }
        }));
        return res.json({ data: matchesEnriquecidos });
    }
    catch (err) {
        console.log(err);
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: "Error del servidor" });
    }
}
