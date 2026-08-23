"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Grupo = void 0;
const mongoose_1 = require("mongoose");
const grupoSchema = new mongoose_1.Schema({
    nombre: { type: String, required: true },
    descripcion: { type: String },
    fecha_creacion: { type: Date, default: Date.now, required: true }, // la fecha se genera al momento de guardar el documento
    lider_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }, // ref: 'User' apuntan a la coleccoin de User (user.model)
    integrantes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }], // ref: 'User' apuntan a la coleccoin de User (user.model)
    activo: { type: Boolean, default: true },
});
exports.Grupo = (0, mongoose_1.model)('Grupo', grupoSchema);
