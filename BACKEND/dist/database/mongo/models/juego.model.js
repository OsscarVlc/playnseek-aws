"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Juego = void 0;
const mongoose_1 = require("mongoose");
const user_types_1 = require("../../../types/user.types");
const juegoSchema = new mongoose_1.Schema({
    titulo: { type: String, required: true },
    imagen: { type: String },
    generos: [{ type: String }],
    plataformas: [{ type: String, enum: Object.values(user_types_1.Plataforma) }],
    id_api: { type: Number, required: true, unique: true },
    activo: { type: Boolean, default: true },
});
//Exportamos el modelo de usuario para poder usarlo en otras partes del proyecto
exports.Juego = (0, mongoose_1.model)('Juego', juegoSchema);
