"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mensaje = void 0;
const mongoose_1 = require("mongoose");
const mensajeSchema = new mongoose_1.Schema({
    usuario_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    contenido: { type: String, required: true },
    fecha: { type: Date, default: Date.now, required: true },
    grupo_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Grupo' },
    destinatario_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }
});
exports.Mensaje = (0, mongoose_1.model)('Mensaje', mensajeSchema);
