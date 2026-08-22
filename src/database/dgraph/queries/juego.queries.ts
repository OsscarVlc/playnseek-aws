import * as dgraph from 'dgraph-js';
import { dgraphClient } from '../../../config/dgraph.config';

export async function crearJuegoEnDgraph(mongoId: string, nombreJuego: string): Promise<string> {
    const txn = dgraphClient.newTxn();

    try {
        const nuevoJuego = {
            'dgraph.type': 'Juego',
            mongo_id: mongoId,
            nombre_juego: nombreJuego,
        };

        const mu = new dgraph.Mutation();
        mu.setSetJson(nuevoJuego);
        mu.setCommitNow(true);

        const response = await txn.mutate(mu);
        const uidsMap = response.getUidsMap();

        let nuevoUid: string | undefined;
        uidsMap.forEach((uid) => {
            if (!nuevoUid) nuevoUid = uid;
        });

        if (!nuevoUid) {
            throw new Error('Dgraph no devolvió un uid para el nodo Juego recién creado');
        }

        console.log(`Nodo Juego creado en Dgraph con uid: ${nuevoUid}`);
        return nuevoUid;
    } catch (err) {
        console.error('Error creando el juego en Dgraph:', err);
        throw err;
    } finally {
        await txn.discard();
    }
}

export async function actualizarJuegoEnDgraph(mongoId: string, cambios: { nombre_juego?: string }): Promise<void> {
    const txn = dgraphClient.newTxn();

    try {
        const query = `
      query buscar($mongoId: string) {
        juego(func: eq(mongo_id, $mongoId)) {
          uid
        }
      }
    `;
        const res = await txn.queryWithVars(query, { $mongoId: mongoId });
        const data = res.getJson();

        if (!data.juego || data.juego.length === 0) {
            throw new Error(`No se encontró un nodo Juego en Dgraph con mongo_id: ${mongoId}`);
        }

        const uid = data.juego[0].uid;

        const mu = new dgraph.Mutation();
        mu.setSetJson({ uid, ...cambios });
        mu.setCommitNow(true);

        await txn.mutate(mu);
        console.log(`Juego ${mongoId} actualizado en Dgraph (uid: ${uid})`);
    } catch (err) {
        console.error(`Error actualizando juego en Dgraph:`, err);
        throw err;
    } finally {
        await txn.discard();
    }
}

async function buscarUidJuegoPorMongoId(mongoId: string): Promise<string> {
    // Buscamos el uid de un nodo Juego en Dgraph a con su mongo_id
    const txn = dgraphClient.newTxn();

    try {
        const query = `
      query buscar($mongoId: string) {
        juego(func: eq(mongo_id, $mongoId)) {
          uid
        }
      }
    `;
        const res = await txn.queryWithVars(query, { $mongoId: mongoId });
        const data = res.getJson();

        if (!data.juego || data.juego.length === 0) {
            throw new Error(`No se encontró un Juego en Dgraph con mongo_id: ${mongoId}`);
        }

        return data.juego[0].uid;
    } finally {
        await txn.discard();
    }
}

async function buscarUidUsuarioPorMongoId(mongoId: string): Promise<string> {
    const txn = dgraphClient.newTxn();

    try {
        const query = `
      query buscar($mongoId: string) {
        usuario(func: eq(mongo_id, $mongoId)) {
          uid
        }
      }
    `;
        const res = await txn.queryWithVars(query, { $mongoId: mongoId });
        const data = res.getJson();

        if (!data.usuario || data.usuario.length === 0) {
            throw new Error(`No se encontró un Usuario en Dgraph con mongo_id: ${mongoId}`);
        }

        return data.usuario[0].uid;
    } finally {
        await txn.discard();
    }
}

// Borramos todas las conexiones "usuario_juega" existentes de un usuario
async function borrarJuegosDeUsuario(usuarioUid: string): Promise<void> {
    const txn = dgraphClient.newTxn();

    try {
        const mu = new dgraph.Mutation();
        mu.setDeleteJson({ uid: usuarioUid, usuario_juega: null });
        mu.setCommitNow(true);
        await txn.mutate(mu);
    } finally {
        await txn.discard();
    }
}

// Conectamos al usuario con la lista de uids de Juego que le correspondan
async function conectarJuegosAUsuario(usuarioUid: string, juegoUids: string[]): Promise<void> {
    if (juegoUids.length === 0) return;

    const txn = dgraphClient.newTxn();

    try {
        const mu = new dgraph.Mutation();
        mu.setSetJson({
            uid: usuarioUid,
            usuario_juega: juegoUids.map((uid) => ({ uid })),
        });
        mu.setCommitNow(true);
        await txn.mutate(mu);
    } finally {
        await txn.discard();
    }
}

export async function sincronizarJuegosUsuario(mongoId: string, mongoIdsJuegos: string[]): Promise<void> {
    // Reemplazaremos las conexiones "usuario_juega" de un usuario
    try {
        const usuarioUid = await buscarUidUsuarioPorMongoId(mongoId);

        await borrarJuegosDeUsuario(usuarioUid); // borramos las viejas para crear las que correspondan a la lista actual de juegos_activos

        const juegoUids: string[] = [];
        for (const juegoMongoId of mongoIdsJuegos) {
            const uid = await buscarUidJuegoPorMongoId(juegoMongoId);
            juegoUids.push(uid);
        }

        await conectarJuegosAUsuario(usuarioUid, juegoUids);

        console.log(`Juegos del usuario ${mongoId} sincronizados en Dgraph`);
    } catch (err) {
        console.error(`Error sincronizando juegos del usuario ${mongoId}:`, err);
        throw err;
    }
}
