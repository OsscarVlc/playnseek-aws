import * as dgraph from 'dgraph-js'; // es el cliente oficial, mediador con dgraph
import * as grpc from '@grpc/grpc-js'; // protocolo de comunicacion de dgraph
import * as fs from 'fs'; // leeremos el archivo del esquema
import * as path from 'path'; // construiremos rutas de archivos

// Direccion de nuestro servidor, usamos el puerto de gRPC
<<<<<<< HEAD
const DGRAPH_ADDRESS = process.env.DGRAPH_ADDRESS || 'localhost:9080';
=======
//Cambio para lambda
const DGRAPH_ADDRESS = process.env.DGRAPH_ADDRESS || 'localhost:9080';

// habilitamos TLS segun el entorno
const credencialesDgraph =
    process.env.DGRAPH_TLS === 'true'
        ? grpc.credentials.createSsl()
        : grpc.credentials.createInsecure();
>>>>>>> sergio

// CREAMOS CONEXION ---------------------------------------------------

// Cliente gRPC
const clientStub = new dgraph.DgraphClientStub(
    // creamos la conexion principal
    DGRAPH_ADDRESS, // le pasamos la direccion
    credencialesDgraph, // usamos TLS cuando está habilitado en la configuración
);

// Cliente de Dgraph que usaremos para queries/mutaciones
const dgraphClient = new dgraph.DgraphClient(clientStub);

// TERMINA CREACION DE CONEXION ---------------------------------------

// CREAMOS ESQUEMA -------------------------------------------------------------------

async function setSchema(): Promise<void> {
    // funcion asincronica para usar el await, Promise<void> es porque la promesa no devuelve valor
    const schemaPath = path.join(__dirname, '..', 'database', 'dgraph', 'schemas', 'schema.graphql'); // le decimos donde esta nuestro esquema
    const schema = fs.readFileSync(schemaPath, 'utf8'); // leemos el contenido

    const op = new dgraph.Operation(); // creamos objeto de operacion
    op.setSchema(schema); // le asignamos el esquema al objeto

    try {
        await dgraphClient.alter(op); // mandamos la operacion a dgraph mediante clientStub y dgraphClient
        console.log('Schema de Dgraph aplicado correctamente');
    } catch (err) {
        console.error('Error aplicando el schema de Dgraph:', err);
        throw err;
    }
}

// TERMINA CREACION DE ESQUEMA ------------------------------------------------------

export { dgraphClient, clientStub, setSchema };
