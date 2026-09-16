"use strict";
/**
 * payload: Es un objeto con la informacion que se guardata en el token (Los datos del usuario)
 * es importante no meter datos sensibles
 *
 * Secret: es el string secreto que tengo en env y se usa para firmar el token,
 * si alguien intenta modificar el payload sin saber el secreto y la firma no coindice
 * usar vreidy() lo rechaza
 *
 * Options: objeto donde se definen las opciones como el expiresIn
 *
 *
 * Objetivo de este archivo:
 * centralizar toda la logica relacionada con JWT en un solo lugar,
 * para que ni el controlador de login ni el middleware tengan que repetir
 * codigo o saber los detalles de como se firma/verifica un token.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.generarTokenConfirmacion = generarTokenConfirmacion;
exports.verificarTokenConfirmacion = verificarTokenConfirmacion;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function generateToken(payload) {
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        return decoded;
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            //jswonWebToken tiene instancias de error especificas para cada clase de error
            throw new Error('Token expirado', { cause: err });
        }
        else if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new Error('Token Invalido', { cause: err });
        }
        throw new Error('Error al verificar el token', { cause: err });
    }
}
function generarTokenConfirmacion(id) {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, { expiresIn: '24h' });
}
function verificarTokenConfirmacion(token) {
    const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    if (typeof decoded === 'string' || !('id' in decoded)) {
        throw new Error('Token de confirmación inválido');
    }
    return { id: decoded.id };
}
