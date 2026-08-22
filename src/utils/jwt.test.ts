import { generateToken, verifyToken } from './jwt';
import jwt from 'jsonwebtoken';

describe('generateToken y verifyToken', () => {
    it('debería generar un token válido y poder verificarlo, recuperando el mismo payload', () => {
        const payload = { _id: '123', correo: 'test@test.com', rol: 'usuario' };

        const token = generateToken(payload);
        const decoded = verifyToken(token);

        expect(decoded).toMatchObject(payload);
    });

    it('debería lanzar "Token Invalido" si el token fue modificado', () => {
        const payload = { _id: '123' };
        const token = generateToken(payload);

        const tokenCorrupto = token.slice(0, -5) + 'XXXXX'; // rompemos la firma a propósito

        expect(() => verifyToken(tokenCorrupto)).toThrow('Token Invalido');
    });

    it('debería lanzar "Token expirado" si el token ya venció', () => {
        const payload = { _id: '123' };
        // Generamos un token que expira casi inmediatamente
        const tokenQueExpiraYa = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1ms' });

        // Esperamos un toque para asegurarnos de que ya expiró
        return new Promise((resolve) => {
            setTimeout(() => {
                expect(() => verifyToken(tokenQueExpiraYa)).toThrow('Token expirado');
                resolve(true);
            }, 50);
        });
    });
});
