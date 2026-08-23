"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
// modelos
const mongoose_1 = require("mongoose");
const user_types_1 = require("../../../types/user.types");
//En este archivo se define el modelo de usuario,
// que es la estructura de los documentos que se guardaran en la coleccion de usuarios en MongoDB
//<Iuser> es un generico que le dice a mongoose que el modelo de usuario debe cumplir con la interfaz IUse
const userSchema = new mongoose_1.Schema({
    nombre: { type: String, required: true },
    edad: { type: Number },
    sexo: { type: String, enum: Object.values(user_types_1.Sexo) }, // enum: Object.values(Sexo) asegura que solo se puedan guardar los valores definidos en el enum Sexo
    correo: { type: String, required: true, unique: true },
    correo_confirmado: { type: Boolean, default: false },
    contrasena_hash: { type: String, required: true },
    rol: { type: String, default: user_types_1.Roles.USER, enum: Object.values(user_types_1.Roles) },
    isActive: { type: Boolean, default: true },
    foto_perfil: { type: String },
    zona_horaria: { type: String },
    horario_juego: { type: [String] },
    disponibilidad: { type: [String] },
    idiomas: [{ type: String, enum: Object.values(user_types_1.Idioma) }],
    modo_juego: [{ type: String, enum: Object.values(user_types_1.ModoDeJuego) }],
    plataformas: [
        {
            nombre: { type: String, enum: Object.values(user_types_1.Plataforma) },
            gamertag: { type: String },
        },
    ],
    juegos_activos: [
        {
            juego_id: { type: mongoose_1.Schema.Types.ObjectId },
            busca_equipo: { type: Boolean },
            desde: { type: Date },
        },
    ],
    juegos_pasados: { type: [mongoose_1.Schema.Types.ObjectId] },
});
//Exportamos el modelo de usuario para poder usarlo en otras partes del proyecto
exports.User = (0, mongoose_1.model)('User', userSchema);
//El schema es la estructura de los documentos, y el modelo es la clase que nos permite interactuar con la coleccion de usuarios en MongoDB
