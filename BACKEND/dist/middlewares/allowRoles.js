"use strict";
// aca iran los middlewares de los roles
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
exports.requireModerador = requireModerador;
const https_status_1 = require("../types/https-status");
const user_types_1 = require("../types/user.types");
function requireAdmin(req, res, next) {
    const userAdmin = req.user;
    if (typeof userAdmin === 'string' || !userAdmin) {
        return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
    }
    if (userAdmin.rol != user_types_1.Roles.ADMIN) {
        return res.status(https_status_1.HttpStatus.FORBIDDEN).json({ message: 'No Cuentas con los permisos necesarios' });
    }
    next();
}
function requireModerador(req, res, next) {
    if (typeof req.user === 'string' || !req.user) {
        return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
    }
    if (req.user.rol !== 'administrador' && req.user.rol !== 'moderador') {
        return res.status(https_status_1.HttpStatus.FORBIDDEN).json({ message: 'No tienes permisos suficientes' });
    }
    next();
}
