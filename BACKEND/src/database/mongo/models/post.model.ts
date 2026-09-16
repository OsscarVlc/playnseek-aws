import { Schema, model } from 'mongoose';
import { IPost } from '../../../types/post.types';

const postSchema = new Schema<IPost>({
    usuario_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    grupo_id: { type: Schema.Types.ObjectId, ref: 'Grupo', required: true },
    contenido: { type: String, required: true },
    imagenes: [{ type: String }],
    fecha: { type: Date, default: Date.now, required: true },
    activo: { type: Boolean, default: true },
});

export const Post = model<IPost>('Post', postSchema);
