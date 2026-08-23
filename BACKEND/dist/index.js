"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const dgraph_config_1 = require("./config/dgraph.config");
const mongo_config_1 = require("./config/mongo.config");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_config_1 = __importDefault(require("./config/swagger.config"));
const node_dns_1 = __importDefault(require("node:dns")); // lo puse para resolver errores de conexion en mi maqina ( sergio )
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const sockets_1 = require("./sockets");
node_dns_1.default.setServers(['8.8.8.8', '8.8.4.4']); // lo puse para resolver errores de conexion en mi maqina ( sergio )
const port = process.env.PORT || 3000;
const specs = (0, swagger_jsdoc_1.default)(swagger_config_1.default);
async function main() {
    try {
        await (0, dgraph_config_1.setSchema)();
    }
    catch (err) {
        console.error('No se pudo aplicar el schema', err);
        process.exit(1);
    }
    await (0, mongo_config_1.mongodbConection)();
    const app = (0, app_1.createApp)();
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs));
    // se crea el servidor HTTP, envolviendo a Express
    const server = http_1.default.createServer(app);
    // se monta Socket.io sobre el servidor de arriba no sobre app
    const io = new socket_io_1.Server(server);
    (0, sockets_1.configurarSockets)(io);
    server.listen(port, () => {
        console.log(`app is running in port ${port}`);
    });
}
main();
