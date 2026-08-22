import { Schema, model } from 'mongoose';
import { ISolicitud, EstadoSolicitud } from '../../../types/solicitud.types';

const solicitudSchema = new Schema<ISolicitud>({
    de_usuario: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    a_usuario: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    estado: { type: String, enum: Object.values(EstadoSolicitud), default: EstadoSolicitud.PENDIENTE },
    fecha_creacion: { type: Date, default: Date.now, required: true },
    fecha_respuesta: { type: Date },
});

export const Solicitud = model<ISolicitud>('Solicitud', solicitudSchema);
