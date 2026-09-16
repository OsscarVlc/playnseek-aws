"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crearComentario = crearComentario;
exports.listarComentarios = listarComentarios;
exports.eliminarComentario = eliminarComentario;
exports.actualizarComentario = actualizarComentario;
const https_status_1 = require("../types/https-status");
const comentario_model_1 = require("../database/mongo/models/comentario.model");
async function crearComentario(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const { post_id, contenido } = req.body;
        if (!post_id) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                message: 'El ID del post es requerido',
            });
        }
        if (contenido === undefined) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                message: 'El contenido del comentario es requerido',
            });
        }
        const nuevoComentario = new comentario_model_1.Comentario({
            post_id,
            usuario_id: req.user._id,
            contenido,
            fecha: new Date(),
        });
        const doc = await nuevoComentario.save();
        console.log('Comentario creado: ' + doc._id);
        res.status(https_status_1.HttpStatus.CREATED).json({
            message: 'Comentario creado exitosamente',
            comentario: {
                _id: doc._id,
                post_id: doc.post_id,
                usuario_id: doc.usuario_id,
                contenido: doc.contenido,
                fecha: doc.fecha,
            },
        });
    }
    catch (err) {
        console.log(err);
        if (err.name === 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        res.status(https_status_1.HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
    }
}
async function listarComentarios(req, res) {
    try {
        const pagina = Number(req.query.pagina) || 1;
        const limite = Number(req.query.limite) || 10;
        const skip = (pagina - 1) * limite;
        const filtro = {};
        if (req.query.post_id) {
            filtro.post_id = req.query.post_id;
        }
        const comentarios = await comentario_model_1.Comentario.find(filtro).populate('usuario_id', 'nombre').skip(skip).limit(limite);
        const total = await comentario_model_1.Comentario.countDocuments(filtro);
        res.json({
            data: comentarios,
            pagina,
            totalPaginas: Math.ceil(total / limite),
            total,
        });
    }
    catch (err) {
        console.log(err);
        res.status(https_status_1.HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
    }
}
async function eliminarComentario(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const comentario = await comentario_model_1.Comentario.findById(id);
        if (!comentario) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: 'No se encontro el comentario' });
        }
        if (comentario.usuario_id.toString() !== req.user._id.toString()) {
            return res.status(https_status_1.HttpStatus.FORBIDDEN).json({ message: 'No eres el autor de este comentario' });
        }
        await comentario_model_1.Comentario.findByIdAndDelete(id);
        return res.json({ message: 'Comentario eliminado correctamente' });
    }
    catch (err) {
        console.log(err);
        if (err.name === 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
async function actualizarComentario(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const { contenido, post_id, usuario_id } = req.body;
        if (post_id !== undefined || usuario_id !== undefined) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                message: 'No se puede modificar post_id o usuario_id desde aquí',
            });
        }
        const comentario = await comentario_model_1.Comentario.findById(id);
        if (!comentario) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: 'No se encontro el comentario' });
        }
        if (comentario.usuario_id.toString() !== req.user._id.toString()) {
            return res.status(https_status_1.HttpStatus.FORBIDDEN).json({ message: 'No eres el autor de este comentario' });
        }
        if (contenido !== undefined) {
            comentario.contenido = contenido;
        }
        const doc = await comentario.save();
        return res.json(doc);
    }
    catch (err) {
        console.log(err);
        if (err.name === 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
