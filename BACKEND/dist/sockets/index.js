"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configurarSockets = configurarSockets;
const chat_socket_1 = require("./chat.socket");
//import { configurarNotificacionesSocket } from './notifications.socket';
const chatPrivado_socket_1 = require("./chatPrivado.socket");
//Es archivo se encarga de conectar chat, notificaciones por separado
function configurarSockets(io) {
    (0, chat_socket_1.configurarChatSocket)(io);
    (0, chatPrivado_socket_1.configurarChatPrivadoSocket)(io);
    // configurarNotificacionesSocket(io);
}
