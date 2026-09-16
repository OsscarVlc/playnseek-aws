"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const express_handlebars_1 = require("express-handlebars");
const handlebars_helpers_1 = require("./config/handlebars-helpers");
const routes_1 = __importDefault(require("./routes"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_vistas_middleware_1 = require("./middlewares/auth-vistas.middleware");
let app;
function createApp() {
    app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use((0, cookie_parser_1.default)());
    app.use(auth_vistas_middleware_1.inyectarUsuarioEnVistas); // middleware global para inyectar usuario en vistas
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
    // Configuración de Handlebars
    app.engine('handlebars', (0, express_handlebars_1.engine)({
        helpers: handlebars_helpers_1.handlebarsHelpers,
    }));
    app.set('view engine', 'handlebars');
    app.set('views', path_1.default.join(__dirname, '..', 'views'));
    app.use(routes_1.default);
    return app;
}
