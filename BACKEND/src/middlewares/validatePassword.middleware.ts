import { Request, Response, NextFunction } from 'express';
import { HttpStatus } from '../types/https-status';

export function validatePassword(req: Request, res: Response, next: NextFunction) {
    const contrasena = req.body.password;
    if (!contrasena) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: 'No agregaste una contrasena' });
    } else if (contrasena.length < 8) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: 'El tamano minimo de la contrasena debe ser de 8' });
    }
    next();
}
