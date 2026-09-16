import { Types } from 'mongoose';

export interface IPost {
    usuario_id: Types.ObjectId;
    grupo_id: Types.ObjectId;
    contenido: string;
    imagenes?: string[];
    fecha: Date;
    activo?: boolean;
}
