import { Socket } from 'socket.io';
import { verifyToken } from '../../utils/jwt';
import { User } from '../../database/mongo/models/user.model';

export interface SocketAutenticado extends Socket {
    usuarioId?: string;
    nombreUsuario?: string;
    rol?: string;
}

/**
 * Este es el middleware de autenticacion para conexiones de Socket.io
 * muy similar  a authMiddleware, pero para sockets
 */

export async function socketAuthMiddleware(socket: SocketAutenticado, next: (err?: Error) => void) {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error('No autenticado'));
    }

    try {
        const decoded = verifyToken(token);

        if (typeof decoded === 'string') {
            return next(new Error('Token inválido'));
        }

        const usuario = await User.findById(decoded._id);

        if (!usuario || !usuario.isActive) {
            return next(new Error('Usuario no válido'));
        }

        socket.usuarioId = decoded._id;
        socket.nombreUsuario = usuario.nombre;
        socket.rol = usuario.rol;
        next();
    } catch {
        next(new Error('Token inválido'));
    }
}
