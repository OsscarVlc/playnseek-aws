import { Types } from 'mongoose';

export interface IComentario {
    post_id: Types.ObjectId;
    usuario_id: Types.ObjectId;
    contenido: string;
    fecha: Date;
}
