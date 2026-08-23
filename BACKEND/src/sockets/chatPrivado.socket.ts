import { Server } from 'socket.io';
import { SocketAutenticado } from './middlewares/socketAuth.middleware';
import { Mensaje } from '../database/mongo/models/mensaje.model';
import { obtenerMatchesDeUsuario } from '../database/dgraph/queries/match.queries';

export function nombreSalaPrivada(idA: string, idB: string): string {
    return `privado_${[idA, idB].sort().join('_')}`;
}

export function configurarChatPrivadoSocket(io: Server) {
    io.on('connection', (socket: SocketAutenticado) => {
        socket.on('unirse_chat_privado', async (otroUsuarioId: string) => {
            if (!socket.usuarioId) return;

            // verificamos que exista un match confirmado entre ambos
            const misMatches = await obtenerMatchesDeUsuario(socket.usuarioId);
            const esMatch = misMatches.some((m) => m.companero.mongo_id === otroUsuarioId);

            if (!esMatch) {
                return socket.emit('error_chat_privado', 'No tienes match con este usuario');
            }

            const sala = nombreSalaPrivada(socket.usuarioId, otroUsuarioId);
            socket.join(sala);

            const mensajes = await Mensaje.find({
                $or: [
                    { usuario_id: socket.usuarioId, destinatario_id: otroUsuarioId },
                    { usuario_id: otroUsuarioId, destinatario_id: socket.usuarioId },
                ],
            })
                .sort({ fecha: 1 })
                .limit(50)
                .lean();

            socket.emit('historial_privado', mensajes);
        });

        socket.on(
            'mensaje_privado_nuevo',
            async ({ destinatarioId, contenido }: { destinatarioId: string; contenido: string }) => {
                if (!socket.usuarioId || !contenido || contenido.trim() === '') return;

                const misMatches = await obtenerMatchesDeUsuario(socket.usuarioId);
                const esMatch = misMatches.some((m) => m.companero.mongo_id === destinatarioId);

                if (!esMatch) {
                    return socket.emit('error_chat_privado', 'No tienes match con este usuario');
                }

                const nuevoMensaje = new Mensaje({
                    usuario_id: socket.usuarioId,
                    destinatario_id: destinatarioId,
                    contenido,
                    fecha: new Date(),
                });

                const doc = await nuevoMensaje.save();

                const sala = nombreSalaPrivada(socket.usuarioId, destinatarioId);
                io.to(sala).emit('mensaje_privado_recibido', doc);
            },
        );
    });
}
