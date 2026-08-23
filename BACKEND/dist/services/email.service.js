"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enviarCorreoConfirmacion = enviarCorreoConfirmacion;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
async function enviarCorreoConfirmacion(destinatario, nombre, urlConfirmacion) {
    await transporter.sendMail({
        from: `"Play N Seek" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: 'Confirma tu cuenta en Play N Seek',
        html: `
            <h2>¡Hola, ${nombre}!</h2>
            <p>Gracias por registrarte en Play N Seek. Confirma tu cuenta dando clic en el siguiente enlace:</p>
            <a href="${urlConfirmacion}">Confirmar mi cuenta</a>
            <p>Si no creaste esta cuenta, ignora este correo.</p>
        `
    });
}
