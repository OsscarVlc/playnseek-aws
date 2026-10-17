"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.getMe = getMe;
exports.actualizarUsuario = actualizarUsuario;
exports.eliminarUsuario = eliminarUsuario;
exports.listarUsuarios = listarUsuarios;
exports.confirmarCuenta = confirmarCuenta;
exports.reenviarConfirmacion = reenviarConfirmacion;
exports.cambiarRolUsuario = cambiarRolUsuario;
exports.agregarJuegoActivo = agregarJuegoActivo;
exports.quitarJuegoActivo = quitarJuegoActivo;
exports.agregarJuegoPasado = agregarJuegoPasado;
exports.quitarJuegoPasado = quitarJuegoPasado;
const user_model_1 = require("../database/mongo/models/user.model");
const https_status_1 = require("../types/https-status");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwt_1 = require("../utils/jwt");
const user_queries_1 = require("../database/dgraph/queries/user.queries"); // para ponerlo en dgraph
const dgraphSync_service_1 = require("../services/dgraphSync.service");
const email_service_1 = require("../services/email.service");
const cloudinary_service_1 = require("../services/cloudinary.service");
const confirmacion_service_1 = require("../services/confirmacion.service");
const mongoose_1 = require("mongoose");
const juego_queries_1 = require("../database/dgraph/queries/juego.queries");
// ---------- Constantes de mensajes (evita strings repetidos) ----------
const MSG_NO_AUTENTICADO = 'No autenticado';
const MSG_USUARIO_NO_ENCONTRADO = 'Usuario no encontrado';
const MSG_ID_INVALIDO = 'Id Invalido';
const MSG_ERROR_SERVIDOR = 'Error del servidor';
const MSG_JUEGO_ID_INVALIDO = 'Id de juego inválido';
const CAMPOS_USUARIO_SIN_CONTRASENA = '-contrasena_hash';
// ---------- Funciones auxiliares (reducen complejidad y duplicación) ----------
/**
 * Maneja los errores de forma centralizada: distingue CastError (id con formato
 * inválido) de cualquier otro error inesperado del servidor.
 */
function manejarErrorControlador(err, res) {
    console.log(err);
    if (err.name === 'CastError') {
        return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: MSG_ID_INVALIDO });
    }
    return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: MSG_ERROR_SERVIDOR });
}
/**
 * Verifica que el request tenga un usuario autenticado válido (no string, no undefined).
 * Si no lo tiene, responde 401 y devuelve null; si lo tiene, lo devuelve.
 */
function obtenerUsuarioAutenticado(req, res) {
    if (typeof req.user === 'string' || !req.user) {
        res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: MSG_NO_AUTENTICADO });
        return null;
    }
    return req.user;
}
/**
 * Valida que el parámetro de ruta juegoId venga como string.
 * Si no, responde 400 y devuelve null.
 */
function obtenerJuegoIdValido(req, res) {
    const { juegoId } = req.params;
    if (typeof juegoId !== 'string') {
        res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: MSG_JUEGO_ID_INVALIDO });
        return null;
    }
    return juegoId;
}
/**
 * Busca un usuario por su _id de Mongo. Si no existe, responde 404 y devuelve null.
 */
async function buscarUsuarioPorId(id, res) {
    const usuario = await user_model_1.User.findById(id);
    if (!usuario) {
        res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: MSG_USUARIO_NO_ENCONTRADO });
        return null;
    }
    return usuario;
}
/**
 * Sincroniza la lista actual de juegos_activos del usuario con Dgraph.
 * No bloquea el flujo si falla, solo lo deja registrado en consola.
 */
async function sincronizarJuegosDelUsuarioEnDgraph(usuarioId, juegosActivos) {
    try {
        const idsJuegos = juegosActivos.map((j) => j.juego_id.toString());
        await (0, juego_queries_1.sincronizarJuegosUsuario)(usuarioId, idsJuegos);
    }
    catch (err) {
        console.error(`usuario ${usuarioId} actualizado en mongo pero FALLO la sincronizacion de juegos con dgraph`, err);
    }
}
// ---------- Controllers ----------
async function registerUser(req, res) {
    try {
        const { name, email, password } = req.body;
        if (name == undefined || email == undefined || password == undefined) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                message: 'Campos requeridos faltantes',
            });
        }
        else {
            const usuarioExistente = await user_model_1.User.findOne({ correo: email });
            if (usuarioExistente) {
                return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                    message: 'Este correo ya esta siendo utilizado',
                });
            }
            const passwordHash = await bcrypt_1.default.hash(password, 10);
            const newUser = new user_model_1.User({
                nombre: name,
                correo: email,
                contrasena_hash: passwordHash,
            });
            const doc = await newUser.save();
            console.log('Usuario creado: ' + doc._id);
            const tokenConfirmacion = (0, jwt_1.generarTokenConfirmacion)(doc._id.toString());
            const urlConfirmacion = `${process.env.APP_URL}/confirmar/${tokenConfirmacion}`;
            try {
                await (0, email_service_1.enviarCorreoConfirmacion)(doc.correo, doc.nombre, urlConfirmacion);
            }
            catch (err) {
                console.error(`Usuario ${doc._id} creado en Mongo pero FALLÓ el envío de correo de confirmación:`, err);
            }
            // Sincronizar con Dgraph (no bloquea el registro si falla) --------------------------------------------------
            try {
                console.log('INICIANDO SINCRONIZACION DGRAPH');
                await (0, user_queries_1.crearUsuarioEnDgraph)(doc._id.toString(), doc.nombre);
            }
            catch (err) {
                console.error(`Usuario ${doc._id} creado en Mongo pero FALLÓ la sincronización con Dgraph:`, err);
            }
            // -----------------------------------------------------------------------------------------------------------
            res.status(https_status_1.HttpStatus.CREATED).json({
                message: 'Usuario creado exitosamente',
                user: {
                    _id: doc._id,
                    nombre: doc.nombre,
                    correo: doc.correo,
                    rol: doc.rol,
                },
            });
        }
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
async function loginUser(req, res) {
    const { email, password } = req.body;
    try {
        const user = await user_model_1.User.findOne({ correo: email });
        if (!user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'Credenciales inválidas' });
        }
        // Comparar la password ingresada con el hash guardado
        const passwordCorrecta = await bcrypt_1.default.compare(password, user.contrasena_hash);
        if (!passwordCorrecta) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'Credenciales inválidas' });
        }
        if (!user.correo_confirmado) {
            return res
                .status(https_status_1.HttpStatus.UNAUTHORIZED)
                .json({ message: 'Debes confirmar tu correo antes de iniciar sesión' });
        }
        // Generar token
        const token = (0, jwt_1.generateToken)({
            _id: user._id,
            correo: user.correo,
            rol: user.rol,
        });
        return res.json({ token: token });
    }
    catch (err) {
        console.log(err);
        res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: 'Server error' });
    }
}
function getMe(req, res) {
    const usuario = obtenerUsuarioAutenticado(req, res);
    if (!usuario)
        return;
    res.json({
        message: 'Usuario autenticado',
        user: {
            id: usuario._id,
            correo: usuario.correo,
            rol: usuario.rol,
        },
    });
}
async function actualizarUsuario(req, res) {
    try {
        const usuarioAuth = obtenerUsuarioAutenticado(req, res);
        if (!usuarioAuth)
            return;
        const { rol, password, correo_confirmado, plataformas, ...resto } = req.body;
        // sacar el rol y password del objeto de actualizacion para hacer validaciones
        // todo lo demas se agrupa dentro de resto como un objeto
        if (rol !== undefined) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'No se puede modificar el rol' });
        }
        if (correo_confirmado !== undefined) {
            return res
                .status(https_status_1.HttpStatus.BAD_REQUEST)
                .json({ message: 'No se puede modificar correo_confirmado desde aquí' });
        }
        const userUpdate = { ...resto };
        // se utiliza spread para expandir la variable resto dentro del objeto de userUpdate
        if (password !== undefined) {
            userUpdate.contrasena_hash = await bcrypt_1.default.hash(password, 10);
        }
        // plataformas llega como string json desde el formulario (multipart/form-data
        // no soporta estructuras anidadas como nombre y gamertag directamente)
        if (plataformas !== undefined) {
            try {
                userUpdate.plataformas = JSON.parse(plataformas);
            }
            catch {
                return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Formato de plataformas inválido' });
            }
        }
        // si viene un archivo (gracias a upload.single('foto_perfil') en la ruta)
        // lo subimos a cloudinary y guardamos la url resultante
        if (req.file) {
            userUpdate.foto_perfil = await (0, cloudinary_service_1.subirImagenACloudinary)(req.file.buffer);
        }
        const usuarioActualizado = await user_model_1.User.findByIdAndUpdate(usuarioAuth._id, userUpdate, { new: true }).select(CAMPOS_USUARIO_SIN_CONTRASENA);
        // select(CAMPOS_USUARIO_SIN_CONTRASENA) es para decirle a mongoose que traiga todo el documento
        // sin contar ese campo y evitar filtrar la contrasena
        if (!usuarioActualizado) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: MSG_USUARIO_NO_ENCONTRADO });
        }
        // toda la sincronizacion con dgraph (datos basicos, idiomas, plataformas) vive
        // en dgraphSync.service.ts, aqui solo se llama una vez con lo que cambio
        await (0, dgraphSync_service_1.sincronizarUsuarioConDgraph)(usuarioAuth._id.toString(), userUpdate);
        return res.json(usuarioActualizado);
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
async function eliminarUsuario(req, res) {
    try {
        const usuario = obtenerUsuarioAutenticado(req, res);
        if (!usuario)
            return;
        const usuarioEliminado = await buscarUsuarioPorId(usuario._id, res);
        if (!usuarioEliminado)
            return;
        //agregar sufijo de eliminacion
        usuarioEliminado.correo += `_eliminado_${Date.now()}`;
        usuarioEliminado.isActive = false;
        await usuarioEliminado.save();
        return res.json({ message: 'Usuario eliminado exitosamente' });
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
async function listarUsuarios(req, res) {
    try {
        const pagina = Number(req.query.pagina) || 1;
        const limite = Number(req.query.limite) || 10;
        const skip = (pagina - 1) * limite;
        const usuariosActivos = req.query.incluirInactivos === 'true' ? {} : { isActive: true };
        const usuarios = await user_model_1.User.find(usuariosActivos).select(CAMPOS_USUARIO_SIN_CONTRASENA).skip(skip).limit(limite);
        const total = await user_model_1.User.countDocuments(usuariosActivos);
        res.json({
            data: usuarios,
            pagina,
            totalPaginas: Math.ceil(total / limite),
            total,
        });
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
async function confirmarCuenta(req, res) {
    try {
        const { token } = req.params;
        if (typeof token !== 'string') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Token inválido' });
        }
        await (0, confirmacion_service_1.confirmarCuentaCore)(token);
        return res.json({ message: 'Cuenta confirmada exitosamente' });
    }
    catch (err) {
        console.log(err);
        return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Token de confirmación inválido o expirado' });
    }
}
async function reenviarConfirmacion(req, res) {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'El correo es requerido' });
        }
        const usuario = await user_model_1.User.findOne({ correo: email });
        if (!usuario) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: 'No existe una cuenta con ese correo' });
        }
        if (usuario.correo_confirmado) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Esta cuenta ya está confirmada' });
        }
        const tokenConfirmacion = (0, jwt_1.generarTokenConfirmacion)(usuario._id.toString());
        const urlConfirmacion = `${process.env.APP_URL}/confirmar/${tokenConfirmacion}`;
        await (0, email_service_1.enviarCorreoConfirmacion)(usuario.correo, usuario.nombre, urlConfirmacion);
        return res.json({ message: 'Correo de confirmación reenviado' });
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
async function cambiarRolUsuario(req, res) {
    try {
        const usuarioAuth = obtenerUsuarioAutenticado(req, res);
        if (!usuarioAuth)
            return;
        const { id } = req.params;
        const { rol } = req.body;
        const rolesValidos = ['administrador', 'usuario', 'moderador'];
        if (!rol || !rolesValidos.includes(rol)) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Rol inválido' });
        }
        if (id === usuarioAuth._id.toString()) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'No puedes cambiar tu propio rol' });
        }
        const usuario = await user_model_1.User.findByIdAndUpdate(id, { rol }, { new: true }).select(CAMPOS_USUARIO_SIN_CONTRASENA);
        if (!usuario) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: MSG_USUARIO_NO_ENCONTRADO });
        }
        return res.json({ message: 'Rol actualizado exitosamente', usuario });
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
async function agregarJuegoActivo(req, res) {
    try {
        const usuarioAuth = obtenerUsuarioAutenticado(req, res);
        if (!usuarioAuth)
            return;
        const juegoId = obtenerJuegoIdValido(req, res);
        if (!juegoId)
            return;
        const { busca_equipo } = req.body;
        const usuario = await buscarUsuarioPorId(usuarioAuth._id, res);
        if (!usuario)
            return;
        usuario.juegos_activos = usuario.juegos_activos || [];
        const existente = usuario.juegos_activos.find((j) => j.juego_id.toString() === juegoId);
        if (existente) {
            existente.busca_equipo = !!busca_equipo;
        }
        else {
            usuario.juegos_activos.push({
                juego_id: new mongoose_1.Types.ObjectId(juegoId),
                busca_equipo: !!busca_equipo,
                desde: new Date(),
            });
        }
        // si estaba en pasados, lo quitamos (lo volvió a jugar)
        usuario.juegos_pasados = (usuario.juegos_pasados || []).filter((id) => id.toString() !== juegoId);
        await usuario.save();
        await sincronizarJuegosDelUsuarioEnDgraph(usuarioAuth._id.toString(), usuario.juegos_activos);
        return res.json({ message: 'Juego agregado a activos', juegos_activos: usuario.juegos_activos });
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
async function quitarJuegoActivo(req, res) {
    try {
        const usuarioAuth = obtenerUsuarioAutenticado(req, res);
        if (!usuarioAuth)
            return;
        const juegoId = obtenerJuegoIdValido(req, res);
        if (!juegoId)
            return;
        const usuario = await buscarUsuarioPorId(usuarioAuth._id, res);
        if (!usuario)
            return;
        const teniaJuego = (usuario.juegos_activos || []).some((j) => j.juego_id.toString() === juegoId);
        if (!teniaJuego) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'No tienes este juego marcado como activo' });
        }
        usuario.juegos_activos = (usuario.juegos_activos || []).filter((j) => j.juego_id.toString() !== juegoId);
        usuario.juegos_pasados = usuario.juegos_pasados || [];
        if (!usuario.juegos_pasados.some((id) => id.toString() === juegoId)) {
            usuario.juegos_pasados.push(new mongoose_1.Types.ObjectId(juegoId));
        }
        await usuario.save();
        await sincronizarJuegosDelUsuarioEnDgraph(usuarioAuth._id.toString(), usuario.juegos_activos);
        return res.json({ message: 'Juego movido a pasados' });
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
async function agregarJuegoPasado(req, res) {
    try {
        const usuarioAuth = obtenerUsuarioAutenticado(req, res);
        if (!usuarioAuth)
            return;
        const juegoId = obtenerJuegoIdValido(req, res);
        if (!juegoId)
            return;
        const usuario = await buscarUsuarioPorId(usuarioAuth._id, res);
        if (!usuario)
            return;
        // si estaba activo, lo quitamos de ahí primero
        usuario.juegos_activos = (usuario.juegos_activos || []).filter((j) => j.juego_id.toString() !== juegoId);
        usuario.juegos_pasados = usuario.juegos_pasados || [];
        if (!usuario.juegos_pasados.some((id) => id.toString() === juegoId)) {
            usuario.juegos_pasados.push(new mongoose_1.Types.ObjectId(juegoId));
        }
        await usuario.save();
        await sincronizarJuegosDelUsuarioEnDgraph(usuarioAuth._id.toString(), usuario.juegos_activos);
        return res.json({ message: 'Juego agregado a pasados' });
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
async function quitarJuegoPasado(req, res) {
    try {
        const usuarioAuth = obtenerUsuarioAutenticado(req, res);
        if (!usuarioAuth)
            return;
        const juegoId = obtenerJuegoIdValido(req, res);
        if (!juegoId)
            return;
        const usuario = await buscarUsuarioPorId(usuarioAuth._id, res);
        if (!usuario)
            return;
        usuario.juegos_pasados = (usuario.juegos_pasados || []).filter((id) => id.toString() !== juegoId);
        await usuario.save();
        return res.json({ message: 'Juego quitado de pasados' });
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
