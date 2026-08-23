"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const https_status_1 = require("../types/https-status");
const jwt_1 = require("../utils/jwt");
const user_model_1 = require("../database/mongo/models/user.model");
async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'Proporciona credenciales validas' });
    }
    const partesHeader = authHeader.split(' ');
    if (partesHeader.length !== 2) {
        return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'formato incorrecto' });
    }
    else if (partesHeader[0] != 'Bearer') {
        return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'formato incorrecto' });
    }
    const token = partesHeader[1];
    try {
        const decoded = (0, jwt_1.verifyToken)(token);
        if (typeof decoded === 'string') {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'Error en el token' });
        }
        const usuario = await user_model_1.User.findById(decoded._id);
        if (!usuario || !usuario.isActive) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'Cuenta no disponible' });
        }
        req.user = decoded;
        next();
    }
    catch (err) {
        console.error('Error en la verificación del token:', err);
        return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'Error en el token' });
    }
}
