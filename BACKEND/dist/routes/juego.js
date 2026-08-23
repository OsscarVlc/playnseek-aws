"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// rutas de los usuarios
const express_1 = require("express");
const juego_controller_1 = require("../controllers/juego.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const allowRoles_1 = require("../middlewares/allowRoles");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /juegos:
 *   get:
 *     tags: [Juegos]
 *     summary: Listar catálogo de juegos
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
 *     responses:
 *       200:
 *         description: Lista paginada de juegos activos.
 */
router.get('/', juego_controller_1.listarJuegos);
/**
 * @swagger
 * /juegos/buscar:
 *   get:
 *     tags: [Juegos]
 *     summary: Buscar juegos en RAWG por nombre
 *     parameters:
 *       - in: query
 *         name: nombre
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre del juego a buscar en RAWG.
 *     responses:
 *       200:
 *         description: Resultados crudos de la búsqueda en RAWG.
 *       400:
 *         description: El parámetro nombre es requerido.
 *       500:
 *         description: Error al consultar RAWG.
 */
router.get('/buscar', juego_controller_1.previsualizarJuego);
/**
 * @swagger
 * /juegos/{id}:
 *   get:
 *     tags: [Juegos]
 *     summary: Obtener un juego por su ID de MongoDB
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del juego en MongoDB.
 *     responses:
 *       200:
 *         description: Datos del juego.
 *       400:
 *         description: ID con formato inválido.
 *       404:
 *         description: Juego no encontrado.
 */
router.get('/:id', juego_controller_1.obtenerJuego);
/**
 * @swagger
 * /juegos/crearJuego:
 *   post:
 *     tags: [Juegos]
 *     summary: Importar un juego desde RAWG (solo admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id]
 *             properties:
 *               id:
 *                 type: number
 *                 description: ID del juego en RAWG (obtenido de /juegos/buscar).
 *     responses:
 *       201:
 *         description: Juego creado exitosamente.
 *       400:
 *         description: Falta el ID, o el juego ya existe.
 *       403:
 *         description: No tienes permisos de administrador.
 */
router.post('/crearJuego', auth_middleware_1.authMiddleware, allowRoles_1.requireAdmin, juego_controller_1.crearJuego);
/**
 * @swagger
 * /juegos/{id}:
 *   patch:
 *     tags: [Juegos]
 *     summary: Actualizar un juego (solo admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               imagen:
 *                 type: string
 *               generos:
 *                 type: array
 *                 items:
 *                   type: string
 *               plataformas:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [pc, playstation, xbox, nintendo_switch, mobile]
 *     responses:
 *       200:
 *         description: Juego actualizado correctamente.
 *       400:
 *         description: ID inválido, o se intentó modificar id_api.
 *       403:
 *         description: No tienes permisos de administrador.
 *       404:
 *         description: Juego no encontrado.
 */
router.patch('/:id', auth_middleware_1.authMiddleware, allowRoles_1.requireAdmin, juego_controller_1.actualizarJuego);
/**
 * @swagger
 * /juegos/{id}:
 *   delete:
 *     tags: [Juegos]
 *     summary: Eliminar (soft delete) un juego (solo admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Juego eliminado (marcado inactivo) correctamente.
 *       400:
 *         description: ID con formato inválido.
 *       403:
 *         description: No tienes permisos de administrador.
 *       404:
 *         description: Juego no encontrado.
 */
router.delete('/:id', auth_middleware_1.authMiddleware, allowRoles_1.requireAdmin, juego_controller_1.eliminarJuego);
exports.default = router;
