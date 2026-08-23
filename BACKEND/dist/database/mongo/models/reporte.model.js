"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reporte = void 0;
const reporte_types_1 = require("../../../types/reporte.types");
const mongoose_1 = require("mongoose");
const reporteSchema = new mongoose_1.Schema({
    remitente_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    reportado_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    motivo: { type: String, enum: Object.values(reporte_types_1.motivoReporte), required: true },
    descripcion: { type: String },
    estado: { type: String, enum: Object.values(reporte_types_1.estadoReporte), default: reporte_types_1.estadoReporte.PENDIENTE },
    fecha: { type: Date, default: Date.now },
    grupo_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Grupo' },
    post_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Post' },
    comentario_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Comentario' },
});
exports.Reporte = (0, mongoose_1.model)('Reporte', reporteSchema);
