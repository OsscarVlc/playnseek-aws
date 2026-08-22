import { Schema, model } from 'mongoose';
import { IMensaje } from '../../../types/mensaje.types';

const mensajeSchema = new Schema<IMensaje>({
    usuario_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    contenido: { type: String, required: true },
    fecha: { type: Date, default: Date.now, required: true },
    grupo_id: { type: Schema.Types.ObjectId, ref: 'Grupo' },
    destinatario_id: { type: Schema.Types.ObjectId, ref: 'User' },
});
export const Mensaje = model<IMensaje>('Mensaje', mensajeSchema);
