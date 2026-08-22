import * as dgraph from 'dgraph-js';
import { dgraphClient } from '../../../config/dgraph.config';

export async function crearComunidadEnDgraph(
    mongoId: string,
    nombreComunidad: string,
    creacion: string, // fecha en formato ISO
): Promise<string> {
    const txn = dgraphClient.newTxn();

    try {
        const nuevaComunidad = {
            'dgraph.type': 'Comunidad',
            mongo_id: mongoId,
            nombre_comunidad: nombreComunidad,
            creacion: creacion,
        };

        const mu = new dgraph.Mutation();
        mu.setSetJson(nuevaComunidad);
        mu.setCommitNow(true);

        const response = await txn.mutate(mu);
        const uidsMap = response.getUidsMap();

        let nuevoUid: string | undefined;
        uidsMap.forEach((uid) => {
            if (!nuevoUid) nuevoUid = uid;
        });

        if (!nuevoUid) {
            throw new Error('Dgraph no devolvió un uid para el nodo Comunidad recién creado');
        }

        console.log(`Nodo Comunidad creado en Dgraph con uid: ${nuevoUid}`);
        return nuevoUid;
    } catch (err) {
        console.error('Error creando la comunidad en Dgraph:', err);
        throw err;
    } finally {
        await txn.discard();
    }
}

async function buscarUidComunidadPorMongoId(mongoId: string): Promise<string> {
    const txn = dgraphClient.newTxn();

    try {
        const query = `
      query buscar($mongoId: string) {
        comunidad(func: eq(mongo_id, $mongoId)) {
          uid
        }
      }
    `;
        const res = await txn.queryWithVars(query, { $mongoId: mongoId });
        const data = res.getJson();

        if (!data.comunidad || data.comunidad.length === 0) {
            throw new Error(`No se encontró una Comunidad en Dgraph con mongo_id: ${mongoId}`);
        }

        return data.comunidad[0].uid;
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

export async function agregarMiembroComunidad(usuarioMongoId: string, comunidadMongoId: string): Promise<void> {
    const usuarioUid = await buscarUidUsuarioPorMongoId(usuarioMongoId);
    const comunidadUid = await buscarUidComunidadPorMongoId(comunidadMongoId);

    const txn = dgraphClient.newTxn();
    try {
        const mu = new dgraph.Mutation();
        mu.setSetJson({
            uid: usuarioUid,
            usuario_miembro_de: [{ uid: comunidadUid }],
        });
        mu.setCommitNow(true);
        await txn.mutate(mu);
        console.log(`Usuario ${usuarioMongoId} conectado a Comunidad ${comunidadMongoId} en Dgraph`);
    } finally {
        await txn.discard();
    }
}

export async function quitarMiembroComunidad(usuarioMongoId: string, comunidadMongoId: string): Promise<void> {
    const usuarioUid = await buscarUidUsuarioPorMongoId(usuarioMongoId);
    const comunidadUid = await buscarUidComunidadPorMongoId(comunidadMongoId);

    const txn = dgraphClient.newTxn();
    try {
        const mu = new dgraph.Mutation();
        mu.setDeleteJson({
            uid: usuarioUid,
            usuario_miembro_de: [{ uid: comunidadUid }],
        });
        mu.setCommitNow(true);
        await txn.mutate(mu);
        console.log(`Usuario ${usuarioMongoId} desconectado de Comunidad ${comunidadMongoId} en Dgraph`);
    } finally {
        await txn.discard();
    }
}
