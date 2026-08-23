import { Request, Response } from 'express';
import { AuthRequest } from '../types/auth-request';
import { HttpStatus } from '../types/https-status';
import { Comentario } from '../database/mongo/models/comentario.model';

interface FiltroComentario {
    post_id?: string;
}

export async function crearComentario(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const { post_id, contenido } = req.body;

        if (!post_id) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'El ID del post es requerido',
            });
        }

        if (contenido === undefined) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'El contenido del comentario es requerido',
            });
        }

        const nuevoComentario = new Comentario({
            post_id,
            usuario_id: req.user._id,
            contenido,
            fecha: new Date(),
        });

        const doc = await nuevoComentario.save();
        console.log('Comentario creado: ' + doc._id);

        res.status(HttpStatus.CREATED).json({
            message: 'Comentario creado exitosamente',
            comentario: {
                _id: doc._id,
                post_id: doc.post_id,
                usuario_id: doc.usuario_id,
                contenido: doc.contenido,
                fecha: doc.fecha,
            },
        });
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        res.status(HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
    }
}

export async function listarComentarios(req: Request, res: Response) {
    try {
        const pagina = Number(req.query.pagina) || 1;
        const limite = Number(req.query.limite) || 10;
        const skip = (pagina - 1) * limite;

        const filtro: FiltroComentario = {};
        if (req.query.post_id) {
            filtro.post_id = req.query.post_id as string;
        }

        const comentarios = await Comentario.find(filtro).populate('usuario_id', 'nombre').skip(skip).limit(limite);
        const total = await Comentario.countDocuments(filtro);

        res.json({
            data: comentarios,
            pagina,
            totalPaginas: Math.ceil(total / limite),
            total,
        });
    } catch (err) {
        console.log(err);
        res.status(HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
    }
}

export async function eliminarComentario(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const { id } = req.params;
        const comentario = await Comentario.findById(id);

        if (!comentario) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'No se encontro el comentario' });
        }

        if (comentario.usuario_id.toString() !== req.user._id.toString()) {
            return res.status(HttpStatus.FORBIDDEN).json({ message: 'No eres el autor de este comentario' });
        }

        await Comentario.findByIdAndDelete(id);

        return res.json({ message: 'Comentario eliminado correctamente' });
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}

export async function actualizarComentario(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const { id } = req.params;
        const { contenido, post_id, usuario_id } = req.body;

        if (post_id !== undefined || usuario_id !== undefined) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'No se puede modificar post_id o usuario_id desde aquí',
            });
        }

        const comentario = await Comentario.findById(id);
        if (!comentario) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'No se encontro el comentario' });
        }

        if (comentario.usuario_id.toString() !== req.user._id.toString()) {
            return res.status(HttpStatus.FORBIDDEN).json({ message: 'No eres el autor de este comentario' });
        }

        if (contenido !== undefined) {
            comentario.contenido = contenido;
        }

        const doc = await comentario.save();
        return res.json(doc);
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
