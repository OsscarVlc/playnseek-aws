import 'dotenv/config';
import { connect, disconnect } from 'mongoose';
import { dgraphClient, clientStub } from '../config/dgraph.config';
import { recuperarLoteUsuariosDgraph } from '../services/recuperacionDgraph.service';

/**
 * Verifica que Dgraph responda y tenga el índice necesario para buscar mongo_id.
 */
async function verificarDgraph(): Promise<void> {
    const txn = dgraphClient.newTxn();

    try {
        await txn.queryWithVars(
            `
                query verificar($mongoId: string) {
                    nodos(func: eq(mongo_id, $mongoId), first: 1) {
                        uid
                    }
                }
            `,
            { $mongoId: '__comprobacion_recuperacion__' },
        );
    } finally {
        await txn.discard();
    }
}

/**
 * Conecta las bases y ejecuta la recuperación de un único lote.
 */
async function ejecutarRecuperacion(): Promise<void> {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error('Falta configurar MONGODB_URI');
    }

    const limite = Number(process.argv[2] ?? '5');
    const cursor = process.argv[3];

    await connect(uri, { serverSelectionTimeoutMS: 10000 });
    await verificarDgraph();

    console.log('Conexiones verificadas. Iniciando recuperación.');

    const resultado = await recuperarLoteUsuariosDgraph(limite, cursor);

    console.log(JSON.stringify(resultado, null, 2));

    if (resultado.errores.length > 0) {
        process.exitCode = 1;
    }
}

/**
 * Libera las conexiones incluso si la recuperación falla.
 */
async function main(): Promise<void> {
    try {
        await ejecutarRecuperacion();
    } catch (error) {
        console.error('No se pudo completar la recuperación:', error);
        process.exitCode = 1;
    } finally {
        try {
            await disconnect();
        } finally {
            clientStub.close();
        }
    }
}

void main().catch((error: unknown) => {
    console.error('Error cerrando las conexiones:', error);
    process.exitCode = 1;
});