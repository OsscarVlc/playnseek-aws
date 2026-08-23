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
            const urlConfirmacion = `http://localhost:3000/confirmar/${tokenConfirmacion}`;
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
        console.log(err);
        res.status(https_status_1.HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
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
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'Debes confirmar tu correo antes de iniciar sesión' });
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
    if (typeof req.user === 'string' || !req.user) {
        return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
    }
    res.json({
        message: 'Usuario autenticado',
        user: {
            id: req.user._id,
            correo: req.user.correo,
            rol: req.user.rol,
        },
    });
}
async function actualizarUsuario(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const { rol, password, correo_confirmado, plataformas, ...resto } = req.body;
        // sacar el rol y password del objeto de actualizacion para hacer validaciones
        // todo lo demas se agrupa dentro de resto como un objeto
        if (rol !== undefined) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'No se puede modificar el rol' });
        }
        if (correo_confirmado !== undefined) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'No se puede modificar correo_confirmado desde aquí' });
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
        const usuarioActualizado = await user_model_1.User.findByIdAndUpdate(req.user._id, userUpdate, { new: true }).select('-contrasena_hash');
        // select('-contrasena_hash') es para decirle a mongoose que traiga todo el documento
        // sin contar ese campo y evitar filtrar la contrasena
        if (!usuarioActualizado) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: 'Usuario no encontrado' });
        }
        // toda la sincronizacion con dgraph (datos basicos, idiomas, plataformas) vive
        // en dgraphSync.service.ts, aqui solo se llama una vez con lo que cambio
        await (0, dgraphSync_service_1.sincronizarUsuarioConDgraph)(req.user._id.toString(), userUpdate);
        return res.json(usuarioActualizado);
    }
    catch (err) {
        console.log(err);
        if (err.name === 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
async function eliminarUsuario(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const usuarioEliminado = await user_model_1.User.findById(req.user._id);
        if (!usuarioEliminado) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: 'Usuario no encontrado' });
        }
        //agregar sufijo de eliminacion
        usuarioEliminado.correo += `_eliminado_${Date.now()}`;
        usuarioEliminado.isActive = false;
        await usuarioEliminado.save();
        return res.json({ message: 'Usuario eliminado exitosamente' });
    }
    catch (err) {
        console.log(err);
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
async function listarUsuarios(req, res) {
    try {
        const pagina = Number(req.query.pagina) || 1;
        const limite = Number(req.query.limite) || 10;
        const skip = (pagina - 1) * limite;
        const usuariosActivos = req.query.incluirInactivos === 'true' ? {} : { isActive: true };
        const usuarios = await user_model_1.User.find(usuariosActivos).select('-contrasena_hash').skip(skip).limit(limite);
        const total = await user_model_1.User.countDocuments(usuariosActivos);
        res.json({
            data: usuarios,
            pagina,
            totalPaginas: Math.ceil(total / limite),
            total,
        });
    }
    catch (err) {
        console.log(err);
        res.status(https_status_1.HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
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
        const urlConfirmacion = `http://localhost:3000/confirmar/${tokenConfirmacion}`;
        await (0, email_service_1.enviarCorreoConfirmacion)(usuario.correo, usuario.nombre, urlConfirmacion);
        return res.json({ message: 'Correo de confirmación reenviado' });
    }
    catch (err) {
        console.log(err);
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
async function cambiarRolUsuario(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const { id } = req.params;
        const { rol } = req.body;
        const rolesValidos = ['administrador', 'usuario', 'moderador'];
        if (!rol || !rolesValidos.includes(rol)) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Rol inválido' });
        }
        if (id === req.user._id.toString()) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'No puedes cambiar tu propio rol' });
        }
        const usuario = await user_model_1.User.findByIdAndUpdate(id, { rol }, { new: true }).select('-contrasena_hash');
        if (!usuario) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: 'Usuario no encontrado' });
        }
        return res.json({ message: 'Rol actualizado exitosamente', usuario });
    }
    catch (err) {
        console.log(err);
        if (err.name === 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
async function agregarJuegoActivo(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const { juegoId } = req.params;
        if (typeof juegoId !== 'string') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id de juego inválido' });
        }
        const { busca_equipo } = req.body;
        const usuario = await user_model_1.User.findById(req.user._id);
        if (!usuario) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: 'Usuario no encontrado' });
        }
        usuario.juegos_activos = usuario.juegos_activos || [];
        const existente = usuario.juegos_activos.find((j) => j.juego_id.toString() === juegoId);
        if (existente) {
            existente.busca_equipo = !!busca_equipo;
        }
        else {
            usuario.juegos_activos.push({
                juego_id: new mongoose_1.Types.ObjectId(juegoId),
                busca_equipo: !!busca_equipo,
                desde: new Date()
            });
        }
        // si estaba en pasados, lo quitamos (lo volvió a jugar)
        usuario.juegos_pasados = (usuario.juegos_pasados || []).filter((id) => id.toString() !== juegoId);
        await usuario.save();
        try {
            const idsJuegos = usuario.juegos_activos.map((j) => j.juego_id.toString());
            await (0, juego_queries_1.sincronizarJuegosUsuario)(req.user._id.toString(), idsJuegos);
        }
        catch (err) {
            console.error(`usuario ${req.user._id} actualizado en mongo pero FALLO la sincronizacion de juegos con dgraph`, err);
        }
        return res.json({ message: 'Juego agregado a activos', juegos_activos: usuario.juegos_activos });
    }
    catch (err) {
        console.log(err);
        if (err.name === 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
async function quitarJuegoActivo(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const { juegoId } = req.params;
        if (typeof juegoId !== 'string') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id de juego inválido' });
        }
        const usuario = await user_model_1.User.findById(req.user._id);
        if (!usuario) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: 'Usuario no encontrado' });
        }
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
        try {
            const idsJuegos = usuario.juegos_activos.map((j) => j.juego_id.toString());
            await (0, juego_queries_1.sincronizarJuegosUsuario)(req.user._id.toString(), idsJuegos);
        }
        catch (err) {
            console.error(`usuario ${req.user._id} actualizado en mongo pero FALLO la sincronizacion de juegos con dgraph`, err);
        }
        return res.json({ message: 'Juego movido a pasados' });
    }
    catch (err) {
        console.log(err);
        if (err.name === 'CastError') {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
