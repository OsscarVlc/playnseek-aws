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
exports.crearComunidadEnDgraph = crearComunidadEnDgraph;
exports.agregarMiembroComunidad = agregarMiembroComunidad;
exports.quitarMiembroComunidad = quitarMiembroComunidad;
const dgraph = __importStar(require("dgraph-js"));
const dgraph_config_1 = require("../../../config/dgraph.config");
async function crearComunidadEnDgraph(mongoId, nombreComunidad, creacion // fecha en formato ISO
) {
    const txn = dgraph_config_1.dgraphClient.newTxn();
    try {
        const nuevaComunidad = {
            "dgraph.type": "Comunidad",
            mongo_id: mongoId,
            nombre_comunidad: nombreComunidad,
            creacion: creacion,
        };
        const mu = new dgraph.Mutation();
        mu.setSetJson(nuevaComunidad);
        mu.setCommitNow(true);
        const response = await txn.mutate(mu);
        const uidsMap = response.getUidsMap();
        let nuevoUid;
        uidsMap.forEach((uid) => {
            if (!nuevoUid)
                nuevoUid = uid;
        });
        if (!nuevoUid) {
            throw new Error("Dgraph no devolvió un uid para el nodo Comunidad recién creado");
        }
        console.log(`Nodo Comunidad creado en Dgraph con uid: ${nuevoUid}`);
        return nuevoUid;
    }
    catch (err) {
        console.error("Error creando la comunidad en Dgraph:", err);
        throw err;
    }
    finally {
        await txn.discard();
    }
}
async function buscarUidComunidadPorMongoId(mongoId) {
    const txn = dgraph_config_1.dgraphClient.newTxn();
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
async function agregarMiembroComunidad(usuarioMongoId, comunidadMongoId) {
    const usuarioUid = await buscarUidUsuarioPorMongoId(usuarioMongoId);
    const comunidadUid = await buscarUidComunidadPorMongoId(comunidadMongoId);
    const txn = dgraph_config_1.dgraphClient.newTxn();
    try {
        const mu = new dgraph.Mutation();
        mu.setSetJson({
            uid: usuarioUid,
            usuario_miembro_de: [{ uid: comunidadUid }],
        });
        mu.setCommitNow(true);
        await txn.mutate(mu);
        console.log(`Usuario ${usuarioMongoId} conectado a Comunidad ${comunidadMongoId} en Dgraph`);
    }
    finally {
        await txn.discard();
    }
}
async function quitarMiembroComunidad(usuarioMongoId, comunidadMongoId) {
    const usuarioUid = await buscarUidUsuarioPorMongoId(usuarioMongoId);
    const comunidadUid = await buscarUidComunidadPorMongoId(comunidadMongoId);
    const txn = dgraph_config_1.dgraphClient.newTxn();
    try {
        const mu = new dgraph.Mutation();
        mu.setDeleteJson({
            uid: usuarioUid,
            usuario_miembro_de: [{ uid: comunidadUid }],
        });
        mu.setCommitNow(true);
        await txn.mutate(mu);
        console.log(`Usuario ${usuarioMongoId} desconectado de Comunidad ${comunidadMongoId} en Dgraph`);
    }
    finally {
        await txn.discard();
    }
}
