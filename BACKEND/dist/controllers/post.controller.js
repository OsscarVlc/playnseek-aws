"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crearPost = crearPost;
exports.listarPosts = listarPosts;
exports.obtenerPost = obtenerPost;
exports.actualizarPost = actualizarPost;
exports.eliminarPost = eliminarPost;
const https_status_1 = require("../types/https-status");
const post_model_1 = require("../database/mongo/models/post.model");
const grupo_model_1 = require("../database/mongo/models/grupo.model");
const cloudinary_service_1 = require("../services/cloudinary.service");
async function crearPost(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const { contenido, grupo_id } = req.body;
        if (!grupo_id) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'El ID del grupo es requerido' });
        }
        if (contenido === undefined) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'El contenido del post es requerido' });
        }
        const imagenes = [];
        if (req.file) {
            const url = await (0, cloudinary_service_1.subirImagenACloudinary)(req.file.buffer);
            imagenes.push(url);
        }
        const nuevoPost = new post_model_1.Post({
            usuario_id: req.user._id,
            grupo_id,
            contenido,
            imagenes,
            fecha: new Date()
        });
        const doc = await nuevoPost.save();
        res.status(https_status_1.HttpStatus.CREATED).json({
            message: "Post creado exitosamente",
            post: {
                _id: doc._id,
                usuario_id: doc.usuario_id,
                grupo_id: doc.grupo_id,
                contenido: doc.contenido,
                imagenes: doc.imagenes,
                fecha: doc.fecha
            }
        });
    }
    catch (err) {
        console.log(err);
        if (err.name === 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: "Error del servidor" });
    }
}
async function listarPosts(req, res) {
    try {
        const pagina = Number(req.query.pagina) || 1;
        const limite = Number(req.query.limite) || 10;
        const skip = (pagina - 1) * limite;
        const filtro = req.query.incluirInactivos === 'true' ? {} : { activo: true };
        if (req.query.grupo_id) {
            if (typeof req.user === 'string' || !req.user) {
                return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'Debes iniciar sesión para ver los posts de un grupo' });
            }
            const miId = req.user._id.toString();
            const esAdmin = req.user.rol === 'administrador';
            const grupo = await grupo_model_1.Grupo.findById(req.query.grupo_id);
            if (!grupo || !grupo.activo) {
                return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: 'Grupo no encontrado' });
            }
            const esIntegrante = grupo.integrantes?.some((i) => i.toString() === miId) ?? false;
            if (!esIntegrante && !esAdmin) {
                return res.status(https_status_1.HttpStatus.FORBIDDEN).json({ message: 'Debes ser integrante del grupo para ver sus posts' });
            }
            filtro.grupo_id = req.query.grupo_id;
        }
        const posts = await post_model_1.Post.find(filtro).skip(skip).limit(limite);
        const total = await post_model_1.Post.countDocuments(filtro);
        res.json({ data: posts, pagina, totalPaginas: Math.ceil(total / limite), total });
    }
    catch (err) {
        console.log(err);
        res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: "Error del servidor" });
    }
}
async function obtenerPost(req, res) {
    try {
        const { id } = req.params; // obtenemos el parametro de la URL
        const post = await post_model_1.Post.findById(id); // buscamos el post con el id que nos dieron
        if (!post || !post.activo) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({
                message: 'No se encontro el post',
            });
        }
        return res.json(post); // si existe lo devolvemos
    }
    catch (err) {
        console.log(err);
        if (err.name === 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                message: 'Id Invalido',
            });
        }
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
    }
}
async function actualizarPost(req, res) {
    // volvemos a requerir saber quien es para ver si tiene permisos
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const { id } = req.params; // obtenemos el id que nos enviaron
        const { contenido, imagenes, usuario_id, grupo_id, activo } = req.body; // recibimos los datos que nos enviaron
        if (grupo_id !== undefined || usuario_id !== undefined || activo !== undefined) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                message: 'No se puede modificar grupo_id, usuario_id o activo desde aquí',
            });
        }
        const post = await post_model_1.Post.findById(id); // buscamos el post
        if (!post || !post.activo) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: 'No se encontro el post' });
        }
        if (post.usuario_id.toString() !== req.user._id.toString()) {
            // verificamos que el usuario autenticado sea el autor del post
            return res.status(https_status_1.HttpStatus.FORBIDDEN).json({ message: 'Solo el autor puede editar el post' });
        }
        const postUpdate = {}; // creamos el objeto de actializacion, con partial porque no le pasaremos todas las propiedades
        if (contenido !== undefined)
            postUpdate.contenido = contenido; // si recibimos contenido lo actualizamos
        if (imagenes !== undefined)
            postUpdate.imagenes = imagenes; // si recibimos imagenes las actualizamos
        const postActualizado = await post_model_1.Post.findByIdAndUpdate(id, postUpdate, { new: true }); // el new true es para devolver el doc actualziado
        return res.json(postActualizado);
    }
    catch (err) {
        console.log(err);
        if (err.name === 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
async function eliminarPost(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const post = await post_model_1.Post.findById(id);
        if (!post) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: 'No se encontro el post' });
        }
        //el usuario autenticado sea el autor
        if (post.usuario_id.toString() !== req.user._id.toString()) {
            return res.status(https_status_1.HttpStatus.FORBIDDEN).json({ message: 'No eres el autor de este post' });
        }
        if (!post.activo) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'El post ya estaba inactivo' });
        }
        post.activo = false; // lo ponemos como inactivo
        await post.save(); // guardamos el cambio
        return res.json({ message: 'Post eliminado (marcado inactivo) correctamente' });
    }
    catch (err) {
        console.log(err);
        if (err.name === 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
