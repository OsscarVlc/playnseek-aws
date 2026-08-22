import { Types } from 'mongoose';

export enum EstadoSolicitud {
    PENDIENTE = 'pendiente',
    ACEPTADA = 'aceptada',
    RECHAZADA = 'rechazada',
    CANCELADA = 'cancelada',
}

export interface ISolicitud {
    de_usuario: Types.ObjectId;
    a_usuario: Types.ObjectId;
    estado: EstadoSolicitud;
    fecha_creacion: Date;
    fecha_respuesta?: Date;
}
