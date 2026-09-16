"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongodbConection = mongodbConection;
// conexion a mongo
const mongoose_1 = require("mongoose");
async function mongodbConection() {
    try {
        await (0, mongoose_1.connect)(process.env.MONGODB_URI);
        console.log('Conexion establecida con Mongodb');
    }
    catch (error) {
        console.log('Error al conectar con Mongodb', error);
        process.exit(1);
    }
}
