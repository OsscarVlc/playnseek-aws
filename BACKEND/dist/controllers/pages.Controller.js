"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mostrarIndex = mostrarIndex;
exports.mostrarLogin = mostrarLogin;
exports.mostrarRegister = mostrarRegister;
exports.logout = logout;
exports.mostrarPerfil = mostrarPerfil;
exports.mostrarJuegos = mostrarJuegos;
exports.mostrarDetalleJuego = mostrarDetalleJuego;
exports.mostrarGrupos = mostrarGrupos;
exports.mostrarDetalleGrupo = mostrarDetalleGrupo;
exports.mostrarConfirmacion = mostrarConfirmacion;
exports.mostrarMatch = mostrarMatch;
exports.mostrarChatPrivado = mostrarChatPrivado;
exports.mostrarAdminUsuarios = mostrarAdminUsuarios;
exports.mostrarModeracionReportes = mostrarModeracionReportes;
const user_model_1 = require("../database/mongo/models/user.model");
const juego_model_1 = require("../database/mongo/models/juego.model");
const grupo_model_1 = require("../database/mongo/models/grupo.model");
const user_types_1 = require("../types/user.types");
const confirmacion_service_1 = require("../services/confirmacion.service");
function mostrarIndex(req, res) {
    res.render('index'); // res.locals.estaLogueado ya está disponible en la vista sin pasarlo aquí
}
function mostrarLogin(req, res) {
    const mensaje = req.query.registrado === 'true'
        ? 'Cuenta creada. Revisa tu correo para confirmarla antes de iniciar sesión.'
        : undefined;
    res.render('login', { mensaje });
}
function mostrarRegister(req, res) {
    res.render('register'); // solo mostramos el formulario
}
function logout(req, res) {
    res.clearCookie('token');
    res.redirect('/');
}
async function mostrarPerfil(req, res) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.redirect('/login');
        }
        const usuario = await user_model_1.User.findById(req.user._id)
            .select('-contrasena_hash')
            .populate('juegos_activos.juego_id', 'titulo')
            .lean();
        const token = req.cookies.token;
        const zonasHorarias = ['GMT-8', 'GMT-7', 'GMT-6', 'GMT-5', 'GMT-4', 'GMT-3'];
        const horariosJuego = ['mañana', 'tarde', 'noche'];
        const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        res.render('perfil', {
            usuario,
            token,
            idiomas: Object.values(user_types_1.Idioma),
            modosJuego: Object.values(user_types_1.ModoDeJuego),
            plataformas: Object.values(user_types_1.Plataforma),
            zonasHorarias,
            horariosJuego,
            diasSemana
        });
    }
    catch (err) {
        console.log(err);
        return res.redirect('/login');
    }
}
async function mostrarJuegos(req, res) {
    try {
        const juegos = await juego_model_1.Juego.find({ activo: true }).lean();
        res.render('juegos', { juegos, token: req.cookies.token });
    }
    catch (err) {
        console.log(err);
        res.render('juegos', { juegos: [], error: 'No se pudieron cargar los juegos' });
    }
}
async function mostrarDetalleJuego(req, res, next) {
    try {
        const { id } = req.params;
        if (typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
            return next();
        }
        const juego = await juego_model_1.Juego.findById(id).lean();
        if (!juego || !juego.activo) {
            return res.render('juego-detalle', { error: 'No se encontró el juego' });
        }
        let esActivo = false;
        let buscaEquipo = false;
        if (typeof req.user === 'object' && req.user !== null) {
            const usuario = await user_model_1.User.findById(req.user._id).lean();
            const entrada = (usuario?.juegos_activos || []).find((j) => j.juego_id.toString() === id);
            if (entrada) {
                esActivo = true;
                buscaEquipo = entrada.busca_equipo;
            }
        }
        res.render('juego-detalle', {
            juego,
            esActivo,
            buscaEquipo,
            juegoId: id,
            token: req.cookies.token
        });
    }
    catch (err) {
        console.log(err);
        res.render('juego-detalle', { error: 'No se encontró el juego' });
    }
}
async function mostrarGrupos(req, res) {
    try {
        const soloMios = req.query.misGrupos === 'true';
        const usuario = res.locals.usuario;
        const filtro = { activo: true };
        if (soloMios && usuario) {
            filtro.integrantes = usuario._id.toString();
        }
        const grupos = await grupo_model_1.Grupo.find(filtro).lean();
        const token = req.cookies.token;
        res.render('grupos', { grupos, soloMios, token });
    }
    catch (err) {
        console.log(err);
        res.render('grupos', { grupos: [], error: 'No se pudieron cargar los grupos' });
    }
}
async function mostrarDetalleGrupo(req, res) {
    try {
        const { id } = req.params;
        const grupo = await grupo_model_1.Grupo.findById(id)
            .populate('integrantes', 'nombre foto_perfil')
            .lean();
        if (!grupo || !grupo.activo) {
            return res.render('grupo-detalle', { error: 'No se encontro el grupo' });
        }
        let miUsuarioId = null;
        let esIntegrante = false;
        let esLider = false;
        if (typeof req.user === 'object' && req.user !== null) {
            miUsuarioId = req.user._id.toString();
            const esAdmin = req.user.rol === 'administrador';
            const perteneceAlGrupo = (grupo.integrantes || []).some((i) => i._id.toString() === miUsuarioId);
            esIntegrante = perteneceAlGrupo || esAdmin;
            esLider = grupo.lider_id.toString() === miUsuarioId;
        }
        res.render('grupo-detalle', {
            grupo,
            esIntegrante,
            esLider,
            estaLogueado: miUsuarioId !== null,
            token: req.cookies.token,
            grupoId: id,
            miUsuarioId
        });
    }
    catch (err) {
        console.log(err);
        res.render('grupo-detalle', { error: 'No se encontro el grupo' });
    }
}
async function mostrarConfirmacion(req, res) {
    try {
        const { token } = req.params;
        if (typeof token !== 'string') {
            return res.render('confirmacion', { error: 'Token inválido' });
        }
        await (0, confirmacion_service_1.confirmarCuentaCore)(token);
        return res.render('confirmacion', { exito: true });
    }
    catch (err) {
        console.log(err);
        return res.render('confirmacion', { error: 'Token de confirmación inválido o expirado' });
    }
}
async function mostrarMatch(req, res) {
    if (typeof req.user === 'string' || !req.user) {
        return res.redirect('/login');
    }
    const token = req.cookies.token;
    res.render('match', { token });
}
async function mostrarChatPrivado(req, res) {
    if (typeof req.user === 'string' || !req.user) {
        return res.redirect('/login');
    }
    const { id } = req.params;
    const otroUsuario = await user_model_1.User.findById(id).select('nombre foto_perfil').lean();
    if (!otroUsuario) {
        return res.render('chat-privado', { error: 'Usuario no encontrado' });
    }
    const token = req.cookies.token;
    res.render('chat-privado', {
        otroUsuario,
        token,
        otroUsuarioId: id,
        miUsuarioId: req.user._id.toString() // nuevo
    });
}
async function mostrarAdminUsuarios(req, res) {
    if (typeof req.user === 'string' || !req.user) {
        return res.redirect('/login');
    }
    const usuarios = await user_model_1.User.find({ isActive: true }).select('-contrasena_hash').lean();
    const token = req.cookies.token;
    res.render('admin-usuarios', { usuarios, token, miUsuarioId: req.user._id.toString() });
}
function mostrarModeracionReportes(req, res) {
    if (typeof req.user === 'string' || !req.user) {
        return res.redirect('/login');
    }
    res.render('moderacion-reportes');
}
