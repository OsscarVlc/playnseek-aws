"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddlewareVistas = authMiddlewareVistas;
exports.authOpcionalVistas = authOpcionalVistas;
exports.inyectarUsuarioEnVistas = inyectarUsuarioEnVistas;
exports.requireAdminVistas = requireAdminVistas;
exports.requireModeradorVistas = requireModeradorVistas;
const jwt_1 = require("../utils/jwt");
const user_model_1 = require("../database/mongo/models/user.model");
async function authMiddlewareVistas(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/login'); // en vez de 401 JSON, redirige a login
    }
    try {
        const decoded = (0, jwt_1.verifyToken)(token);
        if (typeof decoded === 'string') {
            return res.redirect('/login');
        }
        const usuario = await user_model_1.User.findById(decoded._id);
        if (!usuario || !usuario.isActive) {
            return res.redirect('/login');
        }
        req.user = decoded;
        next();
    }
    catch (_err) {
        console.error('Error en la verificación del token:', _err);
        return res.redirect('/login');
    }
}
async function authOpcionalVistas(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        req.user = undefined;
        return next(); // sigue sin usuario, sin bloquear nada
    }
    try {
        const decoded = (0, jwt_1.verifyToken)(token);
        if (typeof decoded !== 'string') {
            const usuario = await user_model_1.User.findById(decoded._id);
            if (usuario && usuario.isActive) {
                req.user = decoded; // sí hay sesión válida
            }
        }
    }
    catch {
        // token invalido/expirado, simplemente lo ignoramos
    }
    next(); // siempre continua, con o sin req.user
}
/**
 * Middleware GLOBAL para los handlebars.
 * A diferencia de authOpcionalVistas (que llena req.user), este llena res.locals,
 * que es un objeto especial de Express: cualquier variable que se agregue aqui
 * queda disponible en TODAS las vistas Handlebars que se rendericen
 * durante esta misma request incluyendo el layout, sin que cada controller
 * tenga que pasarla manualmente en cada res.render(...).
 *
 * Se registra una sola vez en app.ts con app.use(...), así que corre en
 * absolutamente cada request, sin importar la ruta.
 */
async function inyectarUsuarioEnVistas(req, res, next) {
    const token = req.cookies.token;
    // Por defecto, asumimos que nadie esta logueado.
    // Estas dos lienas corren primero para que res.locals nunca quede
    // undefined si no hay token (evitar errores en el layout)
    res.locals.estaLogueado = false;
    res.locals.usuario = null;
    res.locals.token = req.cookies.token || null;
    if (!token) {
        return next(); // sin token, seguimos con los defaults de arriba
    }
    try {
        const decoded = (0, jwt_1.verifyToken)(token);
        if (typeof decoded !== 'string') {
            const usuario = await user_model_1.User.findById(decoded._id).lean();
            if (usuario && usuario.isActive) {
                // Si el token es valido y el usuario existe/activo,
                // se sobreescriben los defaults con los datos reales
                res.locals.estaLogueado = true;
                res.locals.usuario = usuario;
            }
        }
    }
    catch {
        // Token invalido  o expirado etonces  no hacemos nada
        // se quedan los defaults (estaLogueado: false) de arriba
    }
    next(); // siempre se continua lo que significa que este
    //  middleware nunca bloquea ni redirige
}
function requireAdminVistas(req, res, next) {
    if (typeof req.user === 'string' || !req.user || req.user.rol !== 'administrador') {
        return res.redirect('/');
    }
    next();
}
function requireModeradorVistas(req, res, next) {
    if (typeof req.user === 'string' || !req.user ||
        (req.user.rol !== 'administrador' && req.user.rol !== 'moderador')) {
        return res.redirect('/');
    }
    next();
}
