import * as dgraph from 'dgraph-js';
import { dgraphClient } from '../../../config/dgraph.config';

// Buscamos un nodo Plataforma por su valor, si no existe lo crea
// Devuelve el uid del nodo (existente o recién creado)

export async function buscarOCrearPlataforma(nombrePlataforma: string): Promise<string> {
    const txn = dgraphClient.newTxn();

    try {
        const query = `
      query buscar($plataforma: string) {
        plataforma(func: eq(nombre_plataforma, $plataforma)) {
          uid
        }
      }
    `;
        const res = await txn.queryWithVars(query, { $plataforma: nombrePlataforma });
        const data = res.getJson();

        if (data.plataforma && data.plataforma.length > 0) {
            return data.plataforma[0].uid;
        }

        const nuevaPlataforma = {
            'dgraph.type': 'Plataforma',
            nombre_plataforma: nombrePlataforma,
        };

        const mu = new dgraph.Mutation();
        mu.setSetJson(nuevaPlataforma);
        mu.setCommitNow(true);

        const response = await txn.mutate(mu);
        const uidsMap = response.getUidsMap();

        let nuevoUid: string | undefined;
        uidsMap.forEach((uid) => {
            if (!nuevoUid) nuevoUid = uid;
        });

        if (!nuevoUid) {
            throw new Error('Dgraph no devolvió un uid para el nodo Plataforma recién creado');
        }

        console.log(`Nodo Plataforma "${nombrePlataforma}" creado en Dgraph con uid: ${nuevoUid}`);
        return nuevoUid;
    } catch (err) {
        console.error(`Error en buscarOCrearPlataforma("${nombrePlataforma}"):`, err);
        throw err;
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

// Borramos todas las conexiones "juega_en" existentes de un usuario

async function borrarPlataformasDeUsuario(usuarioUid: string): Promise<void> {
    const txn = dgraphClient.newTxn();

    try {
        const mu = new dgraph.Mutation();
        mu.setDeleteJson({ uid: usuarioUid, juega_en: null });
        mu.setCommitNow(true);
        await txn.mutate(mu);
    } finally {
        await txn.discard();
    }
}

// Conectamos al usuario con la lista de uids de Plataforma que le correspondan

async function conectarPlataformasAUsuario(usuarioUid: string, plataformaUids: string[]): Promise<void> {
    if (plataformaUids.length === 0) return;

    const txn = dgraphClient.newTxn();

    try {
        const mu = new dgraph.Mutation();
        mu.setSetJson({
            uid: usuarioUid,
            juega_en: plataformaUids.map((uid) => ({ uid })),
        });
        mu.setCommitNow(true);
        await txn.mutate(mu);
    } finally {
        await txn.discard();
    }
}

// Reemplazamos por completo las conexiones "juega_en" de un usuario
// borramos las viejas y crea las que correspondan a la lista actual de plataformas

export async function sincronizarPlataformasUsuario(mongoId: string, plataformas: string[]): Promise<void> {
    try {
        const usuarioUid = await buscarUidUsuarioPorMongoId(mongoId);

        await borrarPlataformasDeUsuario(usuarioUid);

        const plataformaUids: string[] = [];
        for (const nombrePlataforma of plataformas) {
            const uid = await buscarOCrearPlataforma(nombrePlataforma);
            plataformaUids.push(uid);
        }

        await conectarPlataformasAUsuario(usuarioUid, plataformaUids);

        console.log(`Plataformas del usuario ${mongoId} sincronizadas en Dgraph`);
    } catch (err) {
        console.error(`Error sincronizando plataformas del usuario ${mongoId}:`, err);
        throw err;
    }
}
