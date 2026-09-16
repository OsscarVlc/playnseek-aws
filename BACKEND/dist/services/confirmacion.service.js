"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmarCuentaCore = confirmarCuentaCore;
const user_model_1 = require("../database/mongo/models/user.model");
const jwt_1 = require("../utils/jwt");
// contiene la logica real de confirmar una cuenta, sin decidir como responder
// tanto la api como las vistas la llaman y cada una responde a su manera
async function confirmarCuentaCore(token) {
    const { id } = (0, jwt_1.verificarTokenConfirmacion)(token);
    const usuario = await user_model_1.User.findById(id);
    if (!usuario) {
        throw new Error('Usuario no encontrado');
    }
    usuario.correo_confirmado = true;
    await usuario.save();
    return usuario;
}
