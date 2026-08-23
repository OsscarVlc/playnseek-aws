import { IComentario } from '../../../types/comentario.types';
import { Schema, model } from 'mongoose';

const comentarioSchema = new Schema<IComentario>({
    post_id: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    usuario_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    contenido: { type: String, required: true },
    fecha: { type: Date, default: Date.now, required: true },
});

export const Comentario = model<IComentario>('Comentario', comentarioSchema);
