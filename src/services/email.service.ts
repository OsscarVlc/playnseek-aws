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
