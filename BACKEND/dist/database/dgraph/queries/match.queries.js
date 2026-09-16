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
exports.crearMatchEnDgraph = crearMatchEnDgraph;
exports.obtenerMatchesDeUsuario = obtenerMatchesDeUsuario;
const dgraph = __importStar(require("dgraph-js"));
const dgraph_config_1 = require("../../../config/dgraph.config");
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
// Conectamos a un usuario con un nodo Match 
// Usamos "set" (agregar), no reemplaza las conexiones existentes, porque un usuario puede tener varios matches a la vez.
async function conectarUsuarioAMatch(usuarioUid, matchUid) {
    const txn = dgraph_config_1.dgraphClient.newTxn();
    try {
        const mu = new dgraph.Mutation();
        mu.setSetJson({
            uid: usuarioUid,
            usuario_conecta: [{ uid: matchUid }],
        });
        mu.setCommitNow(true);
        await txn.mutate(mu);
    }
    finally {
        await txn.discard();
    }
}
// Creamos el nodo Match en Dgraph y lo conecta con ambos usuarios con la arista usuario_conecta 
async function crearMatchEnDgraph(mongoIdUsuarioA, mongoIdUsuarioB) {
    const usuarioAUid = await buscarUidUsuarioPorMongoId(mongoIdUsuarioA);
    const usuarioBUid = await buscarUidUsuarioPorMongoId(mongoIdUsuarioB);
    const txn = dgraph_config_1.dgraphClient.newTxn();
    let matchUid;
    try {
        const nuevoMatch = {
            "dgraph.type": "Match",
            fecha: new Date().toISOString(),
        };
        const mu = new dgraph.Mutation();
        mu.setSetJson(nuevoMatch);
        mu.setCommitNow(true);
        const response = await txn.mutate(mu);
        const uidsMap = response.getUidsMap();
        uidsMap.forEach((uid) => {
            if (!matchUid)
                matchUid = uid;
        });
        if (!matchUid) {
            throw new Error("Dgraph no devolvió un uid para el nodo Match recién creado");
        }
        console.log(`Nodo Match creado en Dgraph con uid: ${matchUid}`);
    }
    finally {
        await txn.discard();
    }
    await conectarUsuarioAMatch(usuarioAUid, matchUid);
    await conectarUsuarioAMatch(usuarioBUid, matchUid);
    console.log(`Match conectado entre ${mongoIdUsuarioA} y ${mongoIdUsuarioB} en Dgraph`);
    return matchUid;
}
// Devuelvemos todos los matches de un usuario, con los datos del compañero de cada match (no del propio usuario).
async function obtenerMatchesDeUsuario(mongoId) {
    const txn = dgraph_config_1.dgraphClient.newTxn();
    try {
        const query = `
      query misMatches($mongoId: string) {
        usuario(func: eq(mongo_id, $mongoId)) {
          usuario_conecta {
            fecha
            companero: ~usuario_conecta @filter(NOT eq(mongo_id, $mongoId)) {
              mongo_id
              nombre
            }
          }
        }
      }
    `;
        const res = await txn.queryWithVars(query, { $mongoId: mongoId });
        const data = res.getJson();
        if (!data.usuario || data.usuario.length === 0) {
            return [];
        }
        const matchesRaw = data.usuario[0].usuario_conecta || [];
        const resultado = matchesRaw
            .filter((m) => m.companero && m.companero.length > 0)
            .map((m) => ({
            fecha: m.fecha,
            companero: {
                mongo_id: m.companero[0].mongo_id,
                nombre: m.companero[0].nombre,
            },
        }));
        return resultado;
    }
    catch (err) {
        console.error(`Error obteniendo matches de ${mongoId}:`, err);
        throw err;
    }
    finally {
        await txn.discard();
    }
}
