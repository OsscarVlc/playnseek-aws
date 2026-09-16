"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Comentario = void 0;
const mongoose_1 = require("mongoose");
const comentarioSchema = new mongoose_1.Schema({
    post_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Post', required: true },
    usuario_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    contenido: { type: String, required: true },
    fecha: { type: Date, default: Date.now, required: true },
});
exports.Comentario = (0, mongoose_1.model)('Comentario', comentarioSchema);
