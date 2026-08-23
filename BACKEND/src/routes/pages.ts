import express from 'express';
import {
    mostrarIndex,
    mostrarLogin,
    mostrarRegister,
    mostrarPerfil,
    mostrarJuegos,
    mostrarDetalleJuego,
    mostrarDetalleGrupo,
    mostrarGrupos,
    logout,
    mostrarMatch,
    mostrarConfirmacion,
    mostrarChatPrivado,
    mostrarAdminUsuarios,
    mostrarModeracionReportes,
} from '../controllers/pages.Controller';
import {
    authMiddlewareVistas,
    authOpcionalVistas,
    requireAdminVistas,
    requireModeradorVistas,
} from '../middlewares/auth-vistas.middleware';

const router = express.Router();

router.get('/', authOpcionalVistas, mostrarIndex);
router.get('/login', mostrarLogin);
router.get('/register', mostrarRegister);
router.get('/perfil', authMiddlewareVistas, mostrarPerfil);
router.get('/juegos', mostrarJuegos);
router.get('/juegos/:id', authOpcionalVistas, mostrarDetalleJuego);
router.get('/grupos', mostrarGrupos);
router.get('/grupos/:id', authOpcionalVistas, mostrarDetalleGrupo);
router.get('/logout', logout);

router.get('/match', authMiddlewareVistas, mostrarMatch);
router.get('/confirmar/:token', mostrarConfirmacion);

router.get('/chat/:id', authMiddlewareVistas, mostrarChatPrivado);
router.get('/admin/usuarios', authMiddlewareVistas, requireAdminVistas, mostrarAdminUsuarios);
router.get('/moderacion/reportes', authMiddlewareVistas, requireModeradorVistas, mostrarModeracionReportes);

export default router;
