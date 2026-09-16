import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';

export interface AuthRequest extends Request {
    user?: JwtPayload | string;
}

/**
 * Forma real del payload que generateToken() firma y que verifyToken()
 * devuelve cuando el token es válido: incluye _id y rol además de lo
 * que ya trae JwtPayload por defecto (iat, exp, etc.)
 */
export interface UsuarioAutenticado extends JwtPayload {
    _id: Types.ObjectId;
    correo?: string;
    rol?: string;
}

/**
 *Creamos una interfaz que extienda todo lo que tiene Request de express y
 ademas se le agrega una popiedad opcional de tipo JwtPayload el cual es se importa de la libreria
 jsonwebtoken, este tipo describe la forma del objeto que nos regresaria verify() cuando el token es valido.

 La propiedad es opcional porque no todas las peticiones la van a tener
 */