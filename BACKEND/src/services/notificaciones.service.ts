import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { User } from '../database/mongo/models/user.model';

// Publica eventos de la app en Amazon SNS.
// La app solo avisa "hubo un match"; quién se entera y cómo (correo, push, etc.)
// lo deciden los suscriptores del topic. Hoy el suscriptor es la Lambda notificarMatch.

export interface UsuarioEvento {
    id: string;
    nombre: string;
    correo: string;
}

export interface EventoMatch {
    tipo: 'match_creado';
    fecha: string;
    usuarios: [UsuarioEvento, UsuarioEvento];
}

// El cliente se crea una sola vez y se reutiliza en cada publicación.
// En EC2 toma las credenciales del rol de la instancia (LabRole), sin llaves en el código.
let clienteSns: SNSClient | undefined;

function obtenerClienteSns(): SNSClient {
    clienteSns ??= new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });
    return clienteSns;
}

/**
 * Busca a los dos usuarios del match y arma el evento que se publica en SNS.
 * Devuelve null si alguno ya no existe.
 */
export async function construirEventoMatch(idUsuarioA: string, idUsuarioB: string): Promise<EventoMatch | null> {
    const usuarios = await User.find({ _id: { $in: [idUsuarioA, idUsuarioB] } }).select('nombre correo');

    const usuarioA = usuarios.find((u) => u._id.toString() === idUsuarioA);
    const usuarioB = usuarios.find((u) => u._id.toString() === idUsuarioB);

    if (!usuarioA || !usuarioB) {
        return null;
    }

    return {
        tipo: 'match_creado',
        fecha: new Date().toISOString(),
        usuarios: [
            { id: idUsuarioA, nombre: usuarioA.nombre, correo: usuarioA.correo },
            { id: idUsuarioB, nombre: usuarioB.nombre, correo: usuarioB.correo },
        ],
    };
}

/**
 * Publica en SNS que dos usuarios hicieron match.
 * Nunca lanza error: si SNS falla, el match ya quedó guardado y el usuario
 * debe recibir su respuesta normal; solo se registra el problema en los logs.
 */
export async function notificarMatch(idUsuarioA: string, idUsuarioB: string): Promise<boolean> {
    const topicArn = process.env.SNS_TOPIC_ARN;

    if (!topicArn) {
        console.warn('SNS_TOPIC_ARN no está configurado; no se publicó el evento de match');
        return false;
    }

    try {
        const evento = await construirEventoMatch(idUsuarioA, idUsuarioB);

        if (!evento) {
            console.warn('No se encontraron los usuarios del match; no se publicó el evento');
            return false;
        }

        await obtenerClienteSns().send(
            new PublishCommand({
                TopicArn: topicArn,
                Subject: 'Nuevo match en PlayNSeek',
                Message: JSON.stringify(evento),
                MessageAttributes: {
                    tipo: { DataType: 'String', StringValue: evento.tipo },
                },
            }),
        );

        console.log(`Evento de match publicado en SNS: ${idUsuarioA} <-> ${idUsuarioB}`);
        return true;
    } catch (err) {
        console.error('No se pudo publicar el evento de match en SNS:', err);
        return false;
    }
}
