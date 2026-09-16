"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketAuthMiddleware = socketAuthMiddleware;
const jwt_1 = require("../../utils/jwt");
const user_model_1 = require("../../database/mongo/models/user.model");
/**
 * Este es el middleware de autenticacion para conexiones de Socket.io
 * muy similar  a authMiddleware, pero para sockets
 */
async function socketAuthMiddleware(socket, next) {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('No autenticado'));
    }
    try {
        const decoded = (0, jwt_1.verifyToken)(token);
        if (typeof decoded === 'string') {
            return next(new Error('Token inválido'));
        }
        const usuario = await user_model_1.User.findById(decoded._id);
        if (!usuario || !usuario.isActive) {
            return next(new Error('Usuario no válido'));
        }
        socket.usuarioId = decoded._id;
        socket.nombreUsuario = usuario.nombre;
        socket.rol = usuario.rol;
        next();
    }
    catch {
        next(new Error('Token inválido'));
    }
}
