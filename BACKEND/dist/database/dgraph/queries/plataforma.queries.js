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
exports.buscarOCrearPlataforma = buscarOCrearPlataforma;
exports.sincronizarPlataformasUsuario = sincronizarPlataformasUsuario;
const dgraph = __importStar(require("dgraph-js"));
const dgraph_config_1 = require("../../../config/dgraph.config");
// Buscamos un nodo Plataforma por su valor, si no existe lo crea
// Devuelve el uid del nodo (existente o recién creado)
async function buscarOCrearPlataforma(nombrePlataforma) {
    const txn = dgraph_config_1.dgraphClient.newTxn();
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
        let nuevoUid;
        uidsMap.forEach((uid) => {
            if (!nuevoUid)
                nuevoUid = uid;
        });
        if (!nuevoUid) {
            throw new Error('Dgraph no devolvió un uid para el nodo Plataforma recién creado');
        }
        console.log(`Nodo Plataforma "${nombrePlataforma}" creado en Dgraph con uid: ${nuevoUid}`);
        return nuevoUid;
    }
    catch (err) {
        console.error(`Error en buscarOCrearPlataforma("${nombrePlataforma}"):`, err);
        throw err;
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
// Borramos todas las conexiones "juega_en" existentes de un usuario
async function borrarPlataformasDeUsuario(usuarioUid) {
    const txn = dgraph_config_1.dgraphClient.newTxn();
    try {
        const mu = new dgraph.Mutation();
        mu.setDeleteJson({ uid: usuarioUid, juega_en: null });
        mu.setCommitNow(true);
        await txn.mutate(mu);
    }
    finally {
        await txn.discard();
    }
}
// Conectamos al usuario con la lista de uids de Plataforma que le correspondan
async function conectarPlataformasAUsuario(usuarioUid, plataformaUids) {
    if (plataformaUids.length === 0)
        return;
    const txn = dgraph_config_1.dgraphClient.newTxn();
    try {
        const mu = new dgraph.Mutation();
        mu.setSetJson({
            uid: usuarioUid,
            juega_en: plataformaUids.map((uid) => ({ uid })),
        });
        mu.setCommitNow(true);
        await txn.mutate(mu);
    }
    finally {
        await txn.discard();
    }
}
// Reemplazamos por completo las conexiones "juega_en" de un usuario
// borramos las viejas y crea las que correspondan a la lista actual de plataformas
async function sincronizarPlataformasUsuario(mongoId, plataformas) {
    try {
        const usuarioUid = await buscarUidUsuarioPorMongoId(mongoId);
        await borrarPlataformasDeUsuario(usuarioUid);
        const plataformaUids = [];
        for (const nombrePlataforma of plataformas) {
            const uid = await buscarOCrearPlataforma(nombrePlataforma);
            plataformaUids.push(uid);
        }
        await conectarPlataformasAUsuario(usuarioUid, plataformaUids);
        console.log(`Plataformas del usuario ${mongoId} sincronizadas en Dgraph`);
    }
    catch (err) {
        console.error(`Error sincronizando plataformas del usuario ${mongoId}:`, err);
        throw err;
    }
}
