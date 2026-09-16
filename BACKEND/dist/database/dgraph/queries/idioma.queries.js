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
exports.buscarOCrearIdioma = buscarOCrearIdioma;
exports.sincronizarIdiomasUsuario = sincronizarIdiomasUsuario;
const dgraph = __importStar(require("dgraph-js"));
const dgraph_config_1 = require("../../../config/dgraph.config");
async function buscarOCrearIdioma(nombreIdioma) {
    const txn = dgraph_config_1.dgraphClient.newTxn(); // creamos la transaccion
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
        let nuevoUid;
        uidsMap.forEach((uid) => {
            if (!nuevoUid)
                nuevoUid = uid;
        });
        if (!nuevoUid) {
            throw new Error('Dgraph no devolvió un uid para el nodo Idioma recién creado');
        }
        console.log(`Nodo Idioma "${nombreIdioma}" creado en Dgraph con uid: ${nuevoUid}`);
        return nuevoUid;
    }
    catch (err) {
        console.error(`Error en buscarOCrearIdioma("${nombreIdioma}"):`, err);
        throw err;
    }
    finally {
        await txn.discard();
    }
}
async function buscarUidUsuarioPorMongoId(mongoId) {
    // ahora buscamos al usuario
    const txn = dgraph_config_1.dgraphClient.newTxn();
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
    }
    finally {
        await txn.discard();
    }
}
// Borramos todas las conexiones "habla" que tiene un usuario.
async function borrarIdiomasDeUsuario(usuarioUid) {
    const txn = dgraph_config_1.dgraphClient.newTxn();
    try {
        const mu = new dgraph.Mutation();
        mu.setDeleteJson({ uid: usuarioUid, habla: null });
        mu.setCommitNow(true);
        await txn.mutate(mu);
    }
    finally {
        await txn.discard();
    }
}
// Conectamos al usuario con la lista de uids de Idioma que selecciono
async function conectarIdiomasAUsuario(usuarioUid, idiomaUids) {
    if (idiomaUids.length === 0)
        return; // nada que conectar
    const txn = dgraph_config_1.dgraphClient.newTxn();
    try {
        const mu = new dgraph.Mutation();
        mu.setSetJson({
            uid: usuarioUid,
            habla: idiomaUids.map((uid) => ({ uid })), // los convierte en objetos
        });
        mu.setCommitNow(true);
        await txn.mutate(mu);
    }
    finally {
        await txn.discard();
    }
}
// Reemplazamos las conexiones "habla" de un usuario
// borramos las viejas y crea las que correspondan a la lista actual de idiomas.
async function sincronizarIdiomasUsuario(mongoId, idiomas) {
    try {
        const usuarioUid = await buscarUidUsuarioPorMongoId(mongoId);
        await borrarIdiomasDeUsuario(usuarioUid);
        const idiomaUids = [];
        for (const nombreIdioma of idiomas) {
            const uid = await buscarOCrearIdioma(nombreIdioma);
            idiomaUids.push(uid);
        }
        await conectarIdiomasAUsuario(usuarioUid, idiomaUids);
        console.log(`Idiomas del usuario ${mongoId} sincronizados en Dgraph`);
    }
    catch (err) {
        console.error(`Error sincronizando idiomas del usuario ${mongoId}:`, err);
        throw err;
    }
}
