import { IReporte, motivoReporte, estadoReporte } from '../../../types/reporte.types';
import { Schema, model } from 'mongoose';

const reporteSchema = new Schema<IReporte>({
    remitente_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportado_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    motivo: { type: String, enum: Object.values(motivoReporte), required: true },
    descripcion: { type: String },
    estado: { type: String, enum: Object.values(estadoReporte), default: estadoReporte.PENDIENTE },
    fecha: { type: Date, default: Date.now },
    grupo_id: { type: Schema.Types.ObjectId, ref: 'Grupo' },
    post_id: { type: Schema.Types.ObjectId, ref: 'Post' },
    comentario_id: { type: Schema.Types.ObjectId, ref: 'Comentario' },
});

export const Reporte = model<IReporte>('Reporte', reporteSchema);
