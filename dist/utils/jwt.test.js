"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = require("./jwt");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
describe('generateToken y verifyToken', () => {
    it('debería generar un token válido y poder verificarlo, recuperando el mismo payload', () => {
        const payload = { _id: '123', correo: 'test@test.com', rol: 'usuario' };
        const token = (0, jwt_1.generateToken)(payload);
        const decoded = (0, jwt_1.verifyToken)(token);
        expect(decoded).toMatchObject(payload);
    });
    it('debería lanzar "Token Invalido" si el token fue modificado', () => {
        const payload = { _id: '123' };
        const token = (0, jwt_1.generateToken)(payload);
        const tokenCorrupto = token.slice(0, -5) + 'XXXXX'; // rompemos la firma a propósito
        expect(() => (0, jwt_1.verifyToken)(tokenCorrupto)).toThrow('Token Invalido');
    });
    it('debería lanzar "Token expirado" si el token ya venció', () => {
        const payload = { _id: '123' };
        // Generamos un token que expira casi inmediatamente
        const tokenQueExpiraYa = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: '1ms' });
        // Esperamos un toque para asegurarnos de que ya expiró
        return new Promise((resolve) => {
            setTimeout(() => {
                expect(() => (0, jwt_1.verifyToken)(tokenQueExpiraYa)).toThrow('Token expirado');
                resolve(true);
            }, 50);
        });
    });
});
