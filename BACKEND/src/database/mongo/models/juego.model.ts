import { Schema, model } from 'mongoose';
import { IJuego } from '../../../types/juego.types';
import { Plataforma } from '../../../types/user.types';

const juegoSchema = new Schema<IJuego>({
    titulo: { type: String, required: true },
    imagen: { type: String },
    generos: [{ type: String }],
    plataformas: [{ type: String, enum: Object.values(Plataforma) }],
    id_api: { type: Number, required: true, unique: true },
    activo: { type: Boolean, default: true },
});

//Exportamos el modelo de usuario para poder usarlo en otras partes del proyecto
export const Juego = model<IJuego>('Juego', juegoSchema);
