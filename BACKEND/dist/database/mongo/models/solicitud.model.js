"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Solicitud = void 0;
const mongoose_1 = require("mongoose");
const solicitud_types_1 = require("../../../types/solicitud.types");
const solicitudSchema = new mongoose_1.Schema({
    de_usuario: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    a_usuario: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    estado: { type: String, enum: Object.values(solicitud_types_1.EstadoSolicitud), default: solicitud_types_1.EstadoSolicitud.PENDIENTE },
    fecha_creacion: { type: Date, default: Date.now, required: true },
    fecha_respuesta: { type: Date }
});
exports.Solicitud = (0, mongoose_1.model)('Solicitud', solicitudSchema);
