import { Server } from 'socket.io';
import { socketAuthMiddleware, SocketAutenticado } from './middlewares/socketAuth.middleware';
import { Grupo } from '../database/mongo/models/grupo.model';
import { Mensaje } from '../database/mongo/models/mensaje.model';
import { IMensajeConUsuario } from '../types/mensaje.types';

export function configurarChatSocket(io: Server) {
    io.use(socketAuthMiddleware);

    io.on('connection', (socket: SocketAutenticado) => {
        console.log('Cliente conectado al chat:', socket.id, 'usuario:', socket.usuarioId);

        socket.on('unirse_grupo', async (grupoId: string) => {
            const grupo = await Grupo.findById(grupoId);

            if (!grupo || !grupo.activo) {
                return socket.emit('error_chat', 'Grupo no encontrado');
            }

            const esIntegrante =
                (grupo.integrantes?.some((id) => id.toString() === socket.usuarioId) ?? false) ||
                socket.rol === 'administrador';

            if (!esIntegrante) {
                return socket.emit('error_chat', 'No eres integrante de este grupo');
            }

            socket.join(grupoId);
            console.log(`Usuario ${socket.usuarioId} se unió a la sala del grupo ${grupoId}`);

            const mensajes = await Mensaje.find({ grupo_id: grupoId })
                .sort({ fecha: 1 })
                .limit(50)
                .populate('usuario_id', 'nombre')
                .lean<IMensajeConUsuario[]>();

            const mensajesFormateados = mensajes.map((m) => ({
                _id: m._id,
                usuario_id: m.usuario_id._id,
                nombreUsuario: m.usuario_id.nombre,
                contenido: m.contenido,
                fecha: m.fecha,
            }));

            socket.emit('historial', mensajesFormateados);
        });

        socket.on('mensaje_nuevo', async ({ grupoId, contenido }: { grupoId: string; contenido: string }) => {
            if (!contenido || contenido.trim() === '') {
                return socket.emit('error_chat', 'El mensaje no puede estar vacío');
            }

            const grupo = await Grupo.findById(grupoId);
            if (!grupo || !grupo.activo) {
                return socket.emit('error_chat', 'Grupo no encontrado');
            }

            const esIntegrante =
                (grupo.integrantes?.some((id) => id.toString() === socket.usuarioId) ?? false) ||
                socket.rol === 'administrador';

            if (!esIntegrante) {
                return socket.emit('error_chat', 'No eres integrante de este grupo');
            }

            const nuevoMensaje = new Mensaje({
                grupo_id: grupoId,
                usuario_id: socket.usuarioId,
                contenido,
                fecha: new Date(),
            });

            const doc = await nuevoMensaje.save();

            io.to(grupoId).emit('mensaje_recibido', {
                _id: doc._id,
                usuario_id: doc.usuario_id,
                nombreUsuario: socket.nombreUsuario,
                contenido: doc.contenido,
                fecha: doc.fecha,
            });
        });

        socket.on('disconnect', () => {
            console.log('Cliente desconectado:', socket.id);
        });
    });
}
