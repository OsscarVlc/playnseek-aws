import { Types } from 'mongoose';

export enum motivoReporte {
    SPAM = 'spam',
    ACOSO = 'acoso',
    CONTENIDO_INAPROPIADO = 'contenido_inapropiado',
    OTRO = 'otro',
}

export enum estadoReporte {
    PENDIENTE = 'pendiente',
    RESUELTO = 'resuelto',
    RECHAZADO = 'rechazado',
}

export interface IReporte {
    remitente_id: Types.ObjectId;
    reportado_id: Types.ObjectId; // siempre un User
    motivo: motivoReporte;
    descripcion?: string;
    estado: estadoReporte;
    fecha: Date;
    grupo_id?: Types.ObjectId; // si fue dentro de un grupo
    post_id?: Types.ObjectId; // si el motivo fue un post
    comentario_id?: Types.ObjectId; // si el motivo fue un comentario
}
