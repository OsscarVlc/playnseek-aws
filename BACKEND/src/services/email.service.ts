import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function enviarCorreoConfirmacion(destinatario: string, nombre: string, urlConfirmacion: string) {
    await transporter.sendMail({
        from: `"Play N Seek" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: 'Confirma tu cuenta en Play N Seek',
        html: `
            <h2>¡Hola, ${nombre}!</h2>
            <p>Gracias por registrarte en Play N Seek. Confirma tu cuenta dando clic en el siguiente enlace:</p>
            <a href="${urlConfirmacion}">Confirmar mi cuenta</a>
            <p>Si no creaste esta cuenta, ignora este correo.</p>
        `,
    });
}

/**
 * Avisa a un usuario que hizo match con otro jugador.
 * La usa la Lambda notificarMatch, que recibe el evento desde SNS.
 */
export async function enviarCorreoMatch(
    destinatario: string,
    nombre: string,
    nombreCompanero: string,
    urlMatches: string,
) {
    await transporter.sendMail({
        from: `"Play N Seek" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: `¡Hiciste match con ${nombreCompanero}!`,
        html: `
            <h2>¡Hola, ${nombre}!</h2>
            <p>Tú y <strong>${nombreCompanero}</strong> hicieron match en Play N Seek.</p>
            <p>Ya pueden platicar por el chat y armar su próxima partida.</p>
            <a href="${urlMatches}">Ver mis matches</a>
        `,
    });
}
