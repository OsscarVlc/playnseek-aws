"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configurarChatPrivadoSocket = configurarChatPrivadoSocket;
const mensaje_model_1 = require("../database/mongo/models/mensaje.model");
const match_queries_1 = require("../database/dgraph/queries/match.queries");
function nombreSalaPrivada(idA, idB) {
    return `privado_${[idA, idB].sort().join('_')}`;
}
function configurarChatPrivadoSocket(io) {
    io.on('connection', (socket) => {
        socket.on('unirse_chat_privado', async (otroUsuarioId) => {
            if (!socket.usuarioId)
                return;
            // verificamos que exista un match confirmado entre ambos
            const misMatches = await (0, match_queries_1.obtenerMatchesDeUsuario)(socket.usuarioId);
            const esMatch = misMatches.some((m) => m.companero.mongo_id === otroUsuarioId);
            if (!esMatch) {
                return socket.emit('error_chat_privado', 'No tienes match con este usuario');
            }
            const sala = nombreSalaPrivada(socket.usuarioId, otroUsuarioId);
            socket.join(sala);
            const mensajes = await mensaje_model_1.Mensaje.find({
                $or: [
                    { usuario_id: socket.usuarioId, destinatario_id: otroUsuarioId },
                    { usuario_id: otroUsuarioId, destinatario_id: socket.usuarioId }
                ]
            }).sort({ fecha: 1 }).limit(50).lean();
            socket.emit('historial_privado', mensajes);
        });
        socket.on('mensaje_privado_nuevo', async ({ destinatarioId, contenido }) => {
            if (!socket.usuarioId || !contenido || contenido.trim() === '')
                return;
            const misMatches = await (0, match_queries_1.obtenerMatchesDeUsuario)(socket.usuarioId);
            const esMatch = misMatches.some((m) => m.companero.mongo_id === destinatarioId);
            if (!esMatch) {
                return socket.emit('error_chat_privado', 'No tienes match con este usuario');
            }
            const nuevoMensaje = new mensaje_model_1.Mensaje({
                usuario_id: socket.usuarioId,
                destinatario_id: destinatarioId,
                contenido,
                fecha: new Date()
            });
            const doc = await nuevoMensaje.save();
            const sala = nombreSalaPrivada(socket.usuarioId, destinatarioId);
            io.to(sala).emit('mensaje_privado_recibido', doc);
        });
    });
}
