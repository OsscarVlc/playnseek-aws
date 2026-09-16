"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pages_1 = __importDefault(require("./pages"));
const users_1 = __importDefault(require("./users"));
const juego_1 = __importDefault(require("./juego"));
const grupo_1 = __importDefault(require("./grupo"));
const post_1 = __importDefault(require("./post"));
const comentario_1 = __importDefault(require("./comentario"));
const reporte_1 = __importDefault(require("./reporte"));
const match_1 = __importDefault(require("./match"));
const solicitud_1 = __importDefault(require("./solicitud"));
const recomendacion_1 = __importDefault(require("./recomendacion"));
const router = (0, express_1.Router)(); // usamos el servicio de rutas de express
router.use(pages_1.default);
router.use('/user', users_1.default);
router.use('/juegos', juego_1.default);
router.use('/grupo', grupo_1.default);
router.use('/post', post_1.default);
router.use('/comentario', comentario_1.default);
router.use('/reporte', reporte_1.default);
router.use('/match', match_1.default);
router.use('/solicitud', solicitud_1.default);
router.use('/recomendacion', recomendacion_1.default);
exports.default = router;
