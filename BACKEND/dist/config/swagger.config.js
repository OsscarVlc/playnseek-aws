"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const port = process.env.PORT || 3000;
const config = {
    swaggerDefinition: {
        openapi: '3.1.0',
        info: {
            title: 'Mi API Dummy',
            description: 'Es la mejor API del mundo',
            version: '0.0.1',
        },
        servers: [
            {
                url: `http://localhost:${port}`,
                description: 'Servidor de desarrollo',
            },
        ],
    },
    apis: ['./src/routes/**/*.ts'],
};
exports.default = config;
