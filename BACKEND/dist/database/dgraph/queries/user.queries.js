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
exports.crearUsuarioEnDgraph = crearUsuarioEnDgraph;
exports.actualizarUsuarioEnDgraph = actualizarUsuarioEnDgraph;
exports.asegurarUsuarioEnDgraph = asegurarUsuarioEnDgraph;
const dgraph = __importStar(require("dgraph-js"));
const dgraph_config_1 = require("../../../config/dgraph.config");
async function crearUsuarioEnDgraph(// crearemos el usuario en dgraph
mongoId, // recibimos estos valores
nombre) {
    const txn = dgraph_config_1.dgraphClient.newTxn(); // creamos la transaccion para las operaciones
    try {
        const nuevoUsuario = {
            // creamos el nuevo objeto
            'dgraph.type': 'Usuario',
            mongo_id: mongoId,
            nombre: nombre,
        };
        const mu = new dgraph.Mutation(); // creamos la mutacino
        mu.setSetJson(nuevoUsuario); // indicamos que vamos a settear (nuevo usuario)
        mu.setCommitNow(true); // commit automatico
        const response = await txn.mutate(mu); // ejecutamos la mutacion
        const uidsMap = response.getUidsMap(); // obtenemos el mapa de los UIDs
        let nuevoUid; // puede ser string o undefined porque primero no sabemos si encontraremos el uid
        uidsMap.forEach((uid) => {
            // recorremos el mapa entero
            if (!nuevoUid)
                nuevoUid = uid; // asigna el uid si es que no hay uno ya existente
        });
        if (!nuevoUid) {
            throw new Error('Dgraph no devolvió un uid para el nodo Usuario recién creado');
        }
        console.log(`Nodo Usuario creado en Dgraph con uid: ${nuevoUid}`);
        return nuevoUid;
    }
    catch (err) {
        console.error('Error creando el usuario en Dgraph:', err);
        throw err;
    }
    finally {
        await txn.discard();
    }
}
async function actualizarUsuarioEnDgraph(mongoId, // recibimos el id del usuario que modificaremos
cambios) {
    const txn = dgraph_config_1.dgraphClient.newTxn(); // nueva transaccion
    try {
        // Buscamos el uid del nodo por mongo_id
        const query = `
      query buscar($mongoId: string) {
        usuario(func: eq(mongo_id, $mongoId)) {
          uid
        }
      }
    `;
        const res = await txn.queryWithVars(query, { $mongoId: mongoId }); // ejecutamos la query
        const data = res.getJson(); // obtenemos el json
        if (!data.usuario || data.usuario.length === 0) {
            throw new Error(`No se encontró un nodo en Dgraph con mongo_id: ${mongoId}`);
        }
        const uid = data.usuario[0].uid; // obtenemos el uid para saber que nodo actualizar
        // Actualizarremos solo los campos que vengan en "cambios"
        const mu = new dgraph.Mutation(); // creamos la mutacion
        mu.setSetJson({ uid, ...cambios }); // usamos spread para actualizar los cambios
        mu.setCommitNow(true); // commit automatico
        await txn.mutate(mu); // ejecutamos
        console.log(`Usuario ${mongoId} actualizado en Dgraph (uid: ${uid})`);
    }
    catch (err) {
        console.error(`Error actualizando usuario en Dgraph:`, err);
        throw err;
    }
    finally {
        await txn.discard();
    }
}
/**
 * Busca un usuario por mongo_id y lo crea únicamente si no existe.
 * Devuelve su UID e indica si fue creado durante esta operación.
 */
async function asegurarUsuarioEnDgraph(mongoId, nombre) {
    const txn = dgraph_config_1.dgraphClient.newTxn();
    try {
        const query = `
            query buscar($mongoId: string) {
                usuarios(func: eq(mongo_id, $mongoId)) {
                    uid
                    dgraph.type
                }
            }
        `;
        const respuesta = await txn.queryWithVars(query, { $mongoId: mongoId });
        const datos = respuesta.getJson();
        const usuarios = datos.usuarios ?? [];
        if (usuarios.length > 1) {
            throw new Error(`Existen varios nodos con mongo_id: ${mongoId}`);
        }
        const existente = usuarios[0];
        if (existente) {
            if (!existente['dgraph.type']?.includes('Usuario')) {
                throw new Error(`El nodo con mongo_id ${mongoId} no es de tipo Usuario`);
            }
            return { uid: existente.uid, creado: false };
        }
        const mutacion = new dgraph.Mutation();
        mutacion.setSetJson({
            uid: '_:usuario',
            'dgraph.type': 'Usuario',
            mongo_id: mongoId,
            nombre,
        });
        mutacion.setCommitNow(true);
        const resultado = await txn.mutate(mutacion);
        const uid = resultado.getUidsMap().get('usuario');
        if (!uid) {
            throw new Error(`Dgraph no devolvió el UID del usuario ${mongoId}`);
        }
        return { uid, creado: true };
    }
    finally {
        await txn.discard();
    }
}
