"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Post = void 0;
const mongoose_1 = require("mongoose");
const postSchema = new mongoose_1.Schema({
    usuario_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    grupo_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Grupo', required: true },
    contenido: { type: String, required: true },
    imagenes: [{ type: String }],
    fecha: { type: Date, default: Date.now, required: true },
    activo: { type: Boolean, default: true },
});
exports.Post = (0, mongoose_1.model)('Post', postSchema);
