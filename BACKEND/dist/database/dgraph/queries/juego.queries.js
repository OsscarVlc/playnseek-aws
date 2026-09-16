"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.crearJuegoEnDgraph = crearJuegoEnDgraph;
exports.actualizarJuegoEnDgraph = actualizarJuegoEnDgraph;
exports.sincronizarJuegosUsuario = sincronizarJuegosUsuario;
const dgraph = __importStar(require("dgraph-js"));
const dgraph_config_1 = require("../../../config/dgraph.config");
async function crearJuegoEnDgraph(mongoId, nombreJuego) {
    const txn = dgraph_config_1.dgraphClient.newTxn();
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
        let nuevoUid;
        uidsMap.forEach((uid) => {
            if (!nuevoUid)
                nuevoUid = uid;
        });
        if (!nuevoUid) {
            throw new Error('Dgraph no devolvió un uid para el nodo Juego recién creado');
        }
        console.log(`Nodo Juego creado en Dgraph con uid: ${nuevoUid}`);
        return nuevoUid;
    }
    catch (err) {
        console.error('Error creando el juego en Dgraph:', err);
        throw err;
    }
    finally {
        await txn.discard();
    }
}
async function actualizarJuegoEnDgraph(mongoId, cambios) {
    const txn = dgraph_config_1.dgraphClient.newTxn();
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
    }
    catch (err) {
        console.error(`Error actualizando juego en Dgraph:`, err);
        throw err;
    }
    finally {
        await txn.discard();
    }
}
async function buscarUidJuegoPorMongoId(mongoId) {
    // Buscamos el uid de un nodo Juego en Dgraph a con su mongo_id
    const txn = dgraph_config_1.dgraphClient.newTxn();
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
    }
    finally {
        await txn.discard();
    }
}
async function buscarUidUsuarioPorMongoId(mongoId) {
    const txn = dgraph_config_1.dgraphClient.newTxn();
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
    }
    finally {
        await txn.discard();
    }
}
// Borramos todas las conexiones "usuario_juega" existentes de un usuario
async function borrarJuegosDeUsuario(usuarioUid) {
    const txn = dgraph_config_1.dgraphClient.newTxn();
    try {
        const mu = new dgraph.Mutation();
        mu.setDeleteJson({ uid: usuarioUid, usuario_juega: null });
        mu.setCommitNow(true);
        await txn.mutate(mu);
    }
    finally {
        await txn.discard();
    }
}
// Conectamos al usuario con la lista de uids de Juego que le correspondan
async function conectarJuegosAUsuario(usuarioUid, juegoUids) {
    if (juegoUids.length === 0)
        return;
    const txn = dgraph_config_1.dgraphClient.newTxn();
    try {
        const mu = new dgraph.Mutation();
        mu.setSetJson({
            uid: usuarioUid,
            usuario_juega: juegoUids.map((uid) => ({ uid })),
        });
        mu.setCommitNow(true);
        await txn.mutate(mu);
    }
    finally {
        await txn.discard();
    }
}
async function sincronizarJuegosUsuario(mongoId, mongoIdsJuegos) {
    try {
        const usuarioUid = await buscarUidUsuarioPorMongoId(mongoId);
        await borrarJuegosDeUsuario(usuarioUid); // borramos las viejas para crear las que correspondan a la lista actual de juegos_activos
        const juegoUids = [];
        for (const juegoMongoId of mongoIdsJuegos) {
            const uid = await buscarUidJuegoPorMongoId(juegoMongoId);
            juegoUids.push(uid);
        }
        await conectarJuegosAUsuario(usuarioUid, juegoUids);
        console.log(`Juegos del usuario ${mongoId} sincronizados en Dgraph`);
    }
    catch (err) {
        console.error(`Error sincronizando juegos del usuario ${mongoId}:`, err);
        throw err;
    }
}
