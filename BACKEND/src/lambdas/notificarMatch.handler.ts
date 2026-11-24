import { enviarCorreoMatch } from '../services/email.service';
import type { EventoMatch, UsuarioEvento } from '../services/notificaciones.service';

// Lambda suscrita al topic de SNS de matches.
// Por cada evento "match_creado" manda un correo a cada uno de los dos usuarios.
// Se empaqueta con esbuild (npm run build:lambda) en un solo archivo JS,
// por eso solo importa lo que necesita (email.service), nada de Mongo ni Dgraph.

// Forma mínima del evento que SNS entrega a Lambda.
interface RegistroSns {
    Sns: { Message: string; MessageId?: string };
}

export interface EventoSns {
    Records?: RegistroSns[];
}

function esUsuarioValido(valor: unknown): valor is UsuarioEvento {
    const u = valor as Partial<UsuarioEvento>;
    return (
        typeof u === 'object' &&
        u !== null &&
        typeof u.id === 'string' &&
        typeof u.nombre === 'string' &&
        typeof u.correo === 'string' &&
        u.correo.includes('@')
    );
}

/**
 * Convierte el texto del mensaje de SNS en un EventoMatch válido.
 * Lanza error si el mensaje no tiene el formato esperado.
 */
export function validarEventoMatch(mensaje: string): EventoMatch {
    let datos: unknown;
    try {
        datos = JSON.parse(mensaje);
    } catch {
        throw new Error('El mensaje de SNS no es JSON válido');
    }

    const evento = datos as Partial<EventoMatch>;

    if (evento.tipo !== 'match_creado') {
        throw new Error(`Tipo de evento no soportado: ${String(evento.tipo)}`);
    }

    if (!Array.isArray(evento.usuarios) || evento.usuarios.length !== 2 || !evento.usuarios.every(esUsuarioValido)) {
        throw new Error('El evento debe incluir exactamente dos usuarios con id, nombre y correo');
    }

    return evento as EventoMatch;
}

/**
 * Manda el correo de match a los dos usuarios del evento.
 */
async function procesarEvento(evento: EventoMatch, urlMatches: string): Promise<void> {
    const [a, b] = evento.usuarios;
    await Promise.all([
        enviarCorreoMatch(a.correo, a.nombre, b.nombre, urlMatches),
        enviarCorreoMatch(b.correo, b.nombre, a.nombre, urlMatches),
    ]);
}

export async function handler(evento: EventoSns) {
    const registros = evento.Records ?? [];
    const urlMatches = `${process.env.APP_URL ?? ''}/match`;
    let correosEnviados = 0;

    for (const registro of registros) {
        const eventoMatch = validarEventoMatch(registro.Sns.Message);
        await procesarEvento(eventoMatch, urlMatches);
        correosEnviados += 2;
        console.log(`Correos de match enviados: ${eventoMatch.usuarios[0].id} <-> ${eventoMatch.usuarios[1].id}`);
    }

    // Si algo falla se lanza el error: así SNS reintenta y CloudWatch cuenta el error de la Lambda.
    return { registros: registros.length, correosEnviados };
}
