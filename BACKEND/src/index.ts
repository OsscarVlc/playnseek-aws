import 'dotenv/config';
import { createApp } from './app';
import { setSchema } from './config/dgraph.config';
import { mongodbConection } from './config/mongo.config';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import config from './config/swagger.config';
import dns from 'node:dns'; // lo puse para resolver errores de conexion en mi maqina ( sergio )
import http from 'http';
import { Server } from 'socket.io';
import { configurarSockets } from './sockets';

dns.setServers(['8.8.8.8', '8.8.4.4']); // lo puse para resolver errores de conexion en mi maqina ( sergio )

const port = process.env.PORT || 3000;

const specs = swaggerJSDoc(config);

async function main() {
    try {
        await setSchema();
    } catch (err) {
        console.error('No se pudo aplicar el schema', err);
        process.exit(1);
    }

    await mongodbConection();

    const app = createApp();

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

    // se crea el servidor HTTP, envolviendo a Express
    const server = http.createServer(app);

    // se monta Socket.io sobre el servidor de arriba no sobre app
    const io = new Server(server);
    configurarSockets(io);

    server.listen(port, () => {
        console.log(`app is running in port ${port}`);
    });
}

main();
