import { connect, disconnect } from 'mongoose';
import { recuperarLoteUsuariosDgraph } from '../services/recuperacionDgraph.service';

interface EventoRecuperacion {
    limite?: number;
    cursor?: string;
}

/**
 * Valida el evento recibido antes de iniciar la recuperación.
 */
function validarEvento(evento: unknown): EventoRecuperacion {
    if (typeof evento !== 'object' || evento === null || Array.isArray(evento)) {
        throw new Error('El evento debe ser un objeto');
    }

    const datos = evento as Record<string, unknown>;

    if (datos.limite !== undefined && typeof datos.limite !== 'number') {
        throw new Error('limite debe ser un número');
    }

    if (datos.cursor !== undefined && typeof datos.cursor !== 'string') {
        throw new Error('cursor debe ser un texto');
    }

    return {
        limite: datos.limite as number | undefined,
        cursor: datos.cursor as string | undefined,
    };
}

/**
 * Recupera un lote de usuarios de MongoDB hacia Dgraph.
 * Devuelve los resultados y el cursor para continuar el recorrido.
 */
export async function handler(evento: unknown) {
    const opciones = validarEvento(evento);
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error('Falta configurar MONGODB_URI');
    }

    if (!process.env.DGRAPH_ADDRESS) {
        throw new Error('Falta configurar DGRAPH_ADDRESS');
    }

    try {
        await connect(uri, { serverSelectionTimeoutMS: 10000 });

        const resultado = await recuperarLoteUsuariosDgraph(
            opciones.limite ?? 5,
            opciones.cursor,
        );

        console.log('Resultado de recuperación:', JSON.stringify(resultado));

        return resultado;
    } catch (error) {
        console.error('Falló la ejecución de recuperación:', error);
        throw error;
    } finally {
        await disconnect();
    }
}