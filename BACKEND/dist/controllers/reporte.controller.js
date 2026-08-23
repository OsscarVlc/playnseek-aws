"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crearReporte = crearReporte;
exports.listarReportes = listarReportes;
exports.obtenerReporte = obtenerReporte;
exports.actualizarReporte = actualizarReporte;
const https_status_1 = require("../types/https-status");
const reporte_model_1 = require("../database/mongo/models/reporte.model");
async function crearReporte(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const { reportado_id, motivo, descripcion, grupo_id, post_id, comentario_id } = req.body;
        if (!reportado_id) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'El ID del usuario reportado es requerido' });
        }
        if (!motivo) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'El motivo del reporte es requerido' });
        }
        if (reportado_id === req.user._id.toString()) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'No puedes reportarte a ti mismo' });
        }
        const nuevoReporte = new reporte_model_1.Reporte({
            remitente_id: req.user._id,
            reportado_id,
            motivo,
            descripcion,
            grupo_id,
            post_id,
            comentario_id,
        });
        const doc = await nuevoReporte.save();
        console.log('Reporte creado: ' + doc._id);
        res.status(https_status_1.HttpStatus.CREATED).json({
            message: 'Reporte creado exitosamente',
            reporte: doc,
        });
    }
    catch (err) {
        console.log(err);
        if (err.name === 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
async function listarReportes(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const pagina = Number(req.query.pagina) || 1;
        const limite = Number(req.query.limite) || 10;
        const skip = (pagina - 1) * limite;
        const filtro = {};
        if (req.query.estado) {
            filtro.estado = req.query.estado;
        }
        const reportes = await reporte_model_1.Reporte.find(filtro).skip(skip).limit(limite)
            .populate('remitente_id', 'nombre')
            .populate('reportado_id', 'nombre');
        const total = await reporte_model_1.Reporte.countDocuments(filtro);
        res.json({
            data: reportes,
            pagina,
            totalPaginas: Math.ceil(total / limite),
            total,
        });
    }
    catch (err) {
        console.log(err);
        res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
async function obtenerReporte(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const reporte = await reporte_model_1.Reporte.findById(id);
        if (!reporte) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: 'No se encontro el reporte' });
        }
        return res.json(reporte);
    }
    catch (err) {
        console.log(err);
        if (err.name === 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
async function actualizarReporte(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const { estado } = req.body;
        if (!estado) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'El estado es requerido' });
        }
        const reporte = await reporte_model_1.Reporte.findById(id);
        if (!reporte) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: 'No se encontro el reporte' });
        }
        const reporteUpdate = { estado };
        const reporteActualizado = await reporte_model_1.Reporte.findByIdAndUpdate(id, reporteUpdate, { new: true });
        return res.json(reporteActualizado);
    }
    catch (err) {
        console.log(err);
        if (err.name === 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
