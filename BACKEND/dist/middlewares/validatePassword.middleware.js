"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePassword = validatePassword;
const https_status_1 = require("../types/https-status");
function validatePassword(req, res, next) {
    const contrasena = req.body.password;
    if (!contrasena) {
        return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'No agregaste una contrasena' });
    }
    else if (contrasena.length < 8) {
        return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'El tamano minimo de la contrasena debe ser de 8' });
    }
    next();
}
