import * as dgraph from 'dgraph-js';
import { dgraphClient } from '../../../config/dgraph.config';

export async function buscarOCrearIdioma(nombreIdioma: string): Promise<string> {
    const txn = dgraphClient.newTxn(); // creamos la transaccion

    try {
        // Buscamos si ya existe el idioma
        const query = `
      query buscar($idioma: string) {
        idioma(func: eq(idioma, $idioma)) {
          uid
        }
      }
    `;
        const res = await txn.queryWithVars(query, { $idioma: nombreIdioma });
        const data = res.getJson();

        if (data.idioma && data.idioma.length > 0) {
            // si encontramos un idioma
            return data.idioma[0].uid; // si si regresamos el UID
        }

        // Si no existe, lo creamos
        const nuevoIdioma = {
            'dgraph.type': 'Idioma',
            idioma: nombreIdioma,
        };

        const mu = new dgraph.Mutation(); // creamos mutacion
        mu.setSetJson(nuevoIdioma);
        mu.setCommitNow(true);

        const response = await txn.mutate(mu);
        const uidsMap = response.getUidsMap();

        let nuevoUid: string | undefined;
        uidsMap.forEach((uid) => {
            if (!nuevoUid) nuevoUid = uid;
        });

        if (!nuevoUid) {
            throw new Error('Dgraph no devolvió un uid para el nodo Idioma recién creado');
        }

        console.log(`Nodo Idioma "${nombreIdioma}" creado en Dgraph con uid: ${nuevoUid}`);
        return nuevoUid;
    } catch (err) {
        console.error(`Error en buscarOCrearIdioma("${nombreIdioma}"):`, err);
        throw err;
    } finally {
        await txn.discard();
    }
}

async function buscarUidUsuarioPorMongoId(mongoId: string): Promise<string> {
    // ahora buscamos al usuario
    const txn = dgraphClient.newTxn();

    try {
        // lo buscamos por el id
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

// Borramos todas las conexiones "habla" que tiene un usuario.
async function borrarIdiomasDeUsuario(usuarioUid: string): Promise<void> {
    const txn = dgraphClient.newTxn();

    try {
        const mu = new dgraph.Mutation();
        mu.setDeleteJson({ uid: usuarioUid, habla: null });
        mu.setCommitNow(true);
        await txn.mutate(mu);
    } finally {
        await txn.discard();
    }
}

// Conectamos al usuario con la lista de uids de Idioma que selecciono
async function conectarIdiomasAUsuario(usuarioUid: string, idiomaUids: string[]): Promise<void> {
    if (idiomaUids.length === 0) return; // nada que conectar

    const txn = dgraphClient.newTxn();

    try {
        const mu = new dgraph.Mutation();
        mu.setSetJson({
            uid: usuarioUid,
            habla: idiomaUids.map((uid) => ({ uid })), // los convierte en objetos
        });
        mu.setCommitNow(true);
        await txn.mutate(mu);
    } finally {
        await txn.discard();
    }
}

// Reemplazamos las conexiones "habla" de un usuario
// borramos las viejas y crea las que correspondan a la lista actual de idiomas.

export async function sincronizarIdiomasUsuario(mongoId: string, idiomas: string[]): Promise<void> {
    try {
        const usuarioUid = await buscarUidUsuarioPorMongoId(mongoId);

        await borrarIdiomasDeUsuario(usuarioUid);

        const idiomaUids: string[] = [];
        for (const nombreIdioma of idiomas) {
            const uid = await buscarOCrearIdioma(nombreIdioma);
            idiomaUids.push(uid);
        }

        await conectarIdiomasAUsuario(usuarioUid, idiomaUids);

        console.log(`Idiomas del usuario ${mongoId} sincronizados en Dgraph`);
    } catch (err) {
        console.error(`Error sincronizando idiomas del usuario ${mongoId}:`, err);
        throw err;
    }
}
