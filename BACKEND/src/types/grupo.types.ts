import { Types } from 'mongoose';

export interface IGrupo {
    nombre: string;
    descripcion?: string;
    fecha_creacion: Date;
    lider_id: Types.ObjectId;
    integrantes?: Types.ObjectId[];
    activo?: boolean;
}
