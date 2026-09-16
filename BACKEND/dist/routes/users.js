"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// rutas de los usuarios
const express_1 = require("express");
const users_controller_1 = require("../controllers/users.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validatePassword_middleware_1 = require("../middlewares/validatePassword.middleware");
const allowRoles_1 = require("../middlewares/allowRoles");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /user/register:
 *   post:
 *     tags: [Users]
 *     summary: Registrar un nuevo usuario
 *     description: Crea la cuenta y envía un correo de confirmación. La cuenta no podrá iniciar sesión hasta confirmar el correo.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente.
 *       400:
 *         description: Faltan campos requeridos, contraseña muy corta, o correo ya en uso.
 */
router.post('/register', validatePassword_middleware_1.validatePassword, users_controller_1.registerUser);
/**
 * @swagger
 * /user/login:
 *   post:
 *     tags: [Users]
 *     summary: Iniciar sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login exitoso, regresa un JWT.
 *       401:
 *         description: Credenciales inválidas, o el correo aún no ha sido confirmado.
 */
router.post('/login', users_controller_1.loginUser);
/**
 * @swagger
 * /user/actualizar:
 *   patch:
 *     tags: [Users]
 *     summary: Actualizar el perfil propio
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: Perfil actualizado correctamente.
 *       400:
 *         description: Se intentó modificar el rol.
 *       401:
 *         description: No autenticado.
 */
router.patch('/actualizar', auth_middleware_1.authMiddleware, upload_middleware_1.upload.single('foto_perfil'), users_controller_1.actualizarUsuario);
/**
 * @swagger
 * /user/me:
 *   get:
 *     tags: [Users]
 *     summary: Obtener el perfil del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario autenticado.
 *       401:
 *         description: No autenticado.
 */
router.get('/me', auth_middleware_1.authMiddleware, users_controller_1.getMe);
/**
 * @swagger
 * /user/listarUsuarios:
 *   get:
 *     tags: [Users]
 *     summary: Listar todos los usuarios (solo admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: incluirInactivos
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Lista paginada de usuarios.
 *       403:
 *         description: No tienes permisos de administrador.
 */
router.get('/listarUsuarios', auth_middleware_1.authMiddleware, allowRoles_1.requireAdmin, users_controller_1.listarUsuarios);
/**
 * @swagger
 * /user/eliminar:
 *   delete:
 *     tags: [Users]
 *     summary: Eliminar (soft delete) la cuenta propia
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente.
 *       401:
 *         description: No autenticado.
 */
router.delete('/eliminar', auth_middleware_1.authMiddleware, users_controller_1.eliminarUsuario);
/**
 * @swagger
 * /user/confirmar/{token}:
 *   get:
 *     tags: [Users]
 *     summary: Confirmar cuenta mediante el token enviado por correo
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cuenta confirmada exitosamente.
 *       400:
 *         description: Token inválido o expirado.
 *       404:
 *         description: Usuario no encontrado.
 */
router.get('/confirmar/:token', users_controller_1.confirmarCuenta);
/**
 * @swagger
 * /user/reenviar-confirmacion:
 *   post:
 *     tags: [Users]
 *     summary: Reenviar el correo de confirmación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Correo de confirmación reenviado.
 *       400:
 *         description: La cuenta ya está confirmada.
 *       404:
 *         description: No existe una cuenta con ese correo.
 */
router.post('/reenviar-confirmacion', users_controller_1.reenviarConfirmacion);
/**
 * @swagger
 * /user/{id}/rol:
 *   patch:
 *     tags: [Users]
 *     summary: Cambiar el rol de otro usuario (solo admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rol]
 *             properties:
 *               rol:
 *                 type: string
 *                 enum: [administrador, usuario, moderador]
 *     responses:
 *       200:
 *         description: Rol actualizado exitosamente.
 *       400:
 *         description: Rol inválido, o intentaste cambiar tu propio rol.
 *       403:
 *         description: No tienes permisos de administrador.
 *       404:
 *         description: Usuario no encontrado.
 */
router.patch('/:id/rol', auth_middleware_1.authMiddleware, allowRoles_1.requireAdmin, users_controller_1.cambiarRolUsuario);
router.post('/juegos-activos/:juegoId', auth_middleware_1.authMiddleware, users_controller_1.agregarJuegoActivo);
router.delete('/juegos-activos/:juegoId', auth_middleware_1.authMiddleware, users_controller_1.quitarJuegoActivo);
exports.default = router;
