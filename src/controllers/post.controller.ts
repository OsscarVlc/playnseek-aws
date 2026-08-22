import { Request, Response } from 'express';
import { AuthRequest } from '../types/auth-request';
import { HttpStatus } from '../types/https-status';
import { IPost } from '../types/post.types';
import { Post } from '../database/mongo/models/post.model';
import { Grupo } from '../database/mongo/models/grupo.model';
import { subirImagenACloudinary } from '../services/cloudinary.service';

interface FiltroPost {
    activo?: boolean;
    grupo_id?: string;
}

export async function crearPost(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const { contenido, grupo_id } = req.body;

        if (!grupo_id) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'El ID del grupo es requerido' });
        }

        if (contenido === undefined) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'El contenido del post es requerido' });
        }

        const imagenes: string[] = [];
        if (req.file) {
            const url = await subirImagenACloudinary(req.file.buffer);
            imagenes.push(url);
        }

        const nuevoPost = new Post({
            usuario_id: req.user._id,
            grupo_id,
            contenido,
            imagenes,
            fecha: new Date(),
        });

        const doc = await nuevoPost.save();

        res.status(HttpStatus.CREATED).json({
            message: 'Post creado exitosamente',
            post: {
                _id: doc._id,
                usuario_id: doc.usuario_id,
                grupo_id: doc.grupo_id,
                contenido: doc.contenido,
                imagenes: doc.imagenes,
                fecha: doc.fecha,
            },
        });
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}

export async function listarPosts(req: AuthRequest, res: Response) {
    try {
        const pagina = Number(req.query.pagina) || 1;
        const limite = Number(req.query.limite) || 10;
        const skip = (pagina - 1) * limite;

        const filtro: FiltroPost = req.query.incluirInactivos === 'true' ? {} : { activo: true };

        if (req.query.grupo_id) {
            if (typeof req.user === 'string' || !req.user) {
                return res
                    .status(HttpStatus.UNAUTHORIZED)
                    .json({ message: 'Debes iniciar sesión para ver los posts de un grupo' });
            }

            const miId = req.user._id.toString();
            const esAdmin = req.user.rol === 'administrador';

            const grupo = await Grupo.findById(req.query.grupo_id);
            if (!grupo || !grupo.activo) {
                return res.status(HttpStatus.NOT_FOUND).json({ message: 'Grupo no encontrado' });
            }

            const esIntegrante = grupo.integrantes?.some((i) => i.toString() === miId) ?? false;

            if (!esIntegrante && !esAdmin) {
                return res
                    .status(HttpStatus.FORBIDDEN)
                    .json({ message: 'Debes ser integrante del grupo para ver sus posts' });
            }

            filtro.grupo_id = req.query.grupo_id as string;
        }

        const posts = await Post.find(filtro).skip(skip).limit(limite);
        const total = await Post.countDocuments(filtro);

        res.json({ data: posts, pagina, totalPaginas: Math.ceil(total / limite), total });
    } catch (err) {
        console.log(err);
        res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}

export async function obtenerPost(req: Request, res: Response) {
    try {
        const { id } = req.params; // obtenemos el parametro de la URL
        const post = await Post.findById(id); // buscamos el post con el id que nos dieron

        if (!post || !post.activo) {
            return res.status(HttpStatus.NOT_FOUND).json({
                message: 'No se encontro el post',
            });
        }

        return res.json(post); // si existe lo devolvemos
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Id Invalido',
            });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
    }
}

export async function actualizarPost(req: AuthRequest, res: Response) {
    // volvemos a requerir saber quien es para ver si tiene permisos
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const { id } = req.params; // obtenemos el id que nos enviaron
        const { contenido, imagenes, usuario_id, grupo_id, activo } = req.body; // recibimos los datos que nos enviaron

        if (grupo_id !== undefined || usuario_id !== undefined || activo !== undefined) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'No se puede modificar grupo_id, usuario_id o activo desde aquí',
            });
        }

        const post = await Post.findById(id); // buscamos el post
        if (!post || !post.activo) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'No se encontro el post' });
        }

        if (post.usuario_id.toString() !== req.user._id.toString()) {
            // verificamos que el usuario autenticado sea el autor del post
            return res.status(HttpStatus.FORBIDDEN).json({ message: 'Solo el autor puede editar el post' });
        }

        const postUpdate: Partial<IPost> = {}; // creamos el objeto de actializacion, con partial porque no le pasaremos todas las propiedades
        if (contenido !== undefined) postUpdate.contenido = contenido; // si recibimos contenido lo actualizamos
        if (imagenes !== undefined) postUpdate.imagenes = imagenes; // si recibimos imagenes las actualizamos

        const postActualizado = await Post.findByIdAndUpdate(id, postUpdate, { new: true }); // el new true es para devolver el doc actualziado
        return res.json(postActualizado);
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}

export async function eliminarPost(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const { id } = req.params;
        const post = await Post.findById(id);

        if (!post) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'No se encontro el post' });
        }

        //el usuario autenticado sea el autor
        if (post.usuario_id.toString() !== req.user._id.toString()) {
            return res.status(HttpStatus.FORBIDDEN).json({ message: 'No eres el autor de este post' });
        }

        if (!post.activo) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'El post ya estaba inactivo' });
        }

        post.activo = false; // lo ponemos como inactivo
        await post.save(); // guardamos el cambio

        return res.json({ message: 'Post eliminado (marcado inactivo) correctamente' });
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
