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
exports.clientStub = exports.dgraphClient = void 0;
exports.setSchema = setSchema;
const dgraph = __importStar(require("dgraph-js")); // es el cliente oficial, mediador con dgraph
const grpc = __importStar(require("@grpc/grpc-js")); // protocolo de comunicacion de dgraph
const fs = __importStar(require("fs")); // leeremos el archivo del esquema
const path = __importStar(require("path")); // construiremos rutas de archivos
// Direccion de nuestro servidor, usamos el puerto de gRPC
const DGRAPH_ADDRESS = 'localhost:9080';
// CREAMOS CONEXION ---------------------------------------------------
// Cliente gRPC
const clientStub = new dgraph.DgraphClientStub(
// creamos la conexion principal
DGRAPH_ADDRESS, // le pasamos la direccion
grpc.credentials.createInsecure());
exports.clientStub = clientStub;
// Cliente de Dgraph que usaremos para queries/mutaciones
const dgraphClient = new dgraph.DgraphClient(clientStub);
exports.dgraphClient = dgraphClient;
// TERMINA CREACION DE CONEXION ---------------------------------------
// CREAMOS ESQUEMA -------------------------------------------------------------------
async function setSchema() {
    // funcion asincronica para usar el await, Promise<void> es porque la promesa no devuelve valor
    const schemaPath = path.join(__dirname, '..', 'database', 'dgraph', 'schemas', 'schema.graphql'); // le decimos donde esta nuestro esquema
    const schema = fs.readFileSync(schemaPath, 'utf8'); // leemos el contenido
    const op = new dgraph.Operation(); // creamos objeto de operacion
    op.setSchema(schema); // le asignamos el esquema al objeto
    try {
        await dgraphClient.alter(op); // mandamos la operacion a dgraph mediante clientStub y dgraphClient
        console.log('Schema de Dgraph aplicado correctamente');
    }
    catch (err) {
        console.error('Error aplicando el schema de Dgraph:', err);
        throw err;
    }
}
