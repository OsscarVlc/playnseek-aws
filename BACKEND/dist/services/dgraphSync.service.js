"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sincronizarUsuarioConDgraph = sincronizarUsuarioConDgraph;
const user_queries_1 = require("../database/dgraph/queries/user.queries");
const idioma_queries_1 = require("../database/dgraph/queries/idioma.queries");
const plataforma_queries_1 = require("../database/dgraph/queries/plataforma.queries");
const juego_queries_1 = require("../database/dgraph/queries/juego.queries");
// centraliza toda la sincronizacion de un usuario con dgraph tras una actualizacion
// nunca lanza errores hacia arriba, cada pieza falla en silencio (solo loggea)
// porque un fallo de dgraph no debe romper una actualizacion exitosa en mongo
async function sincronizarUsuarioConDgraph(mongoId, userUpdate) {
    // actualizar datos basicos en dgraph -----------------------------------------------------------------------------
    try {
        const camposDgraph = {}; // creamos un objeto vacio
        if (userUpdate.nombre !== undefined)
            camposDgraph.nombre = userUpdate.nombre; // pasamos los datos que nos interesan
        if (userUpdate.edad !== undefined)
            camposDgraph.edad = userUpdate.edad; // pasamos los datos que nos interesan
        if (userUpdate.sexo !== undefined)
            camposDgraph.genero = userUpdate.sexo; // pasamos los datos que nos interesan
        if (userUpdate.rol !== undefined)
            camposDgraph.rol = userUpdate.rol; // pasamos los datos que nos interesan
        if (Object.keys(camposDgraph).length > 0) { // verificamos si hay algo que actualizar
            await (0, user_queries_1.actualizarUsuarioEnDgraph)(mongoId, camposDgraph); // si los hay los mandamos a la funcion
        }
    }
    catch (err) {
        console.error(`usuario ${mongoId} actualizado en mongo pero FALLO la sincronizacion con dgraph`, err);
    }
    // -----------------------------------------------------------------------------------------------------------------
    // sincronizar idiomas en dgraph ------------------------------------------------------------------------------------
    if (userUpdate.idiomas !== undefined) {
        try {
            await (0, idioma_queries_1.sincronizarIdiomasUsuario)(mongoId, userUpdate.idiomas);
        }
        catch (err) {
            console.error(`usuario ${mongoId} actualizado en mongo pero FALLO la sincronizacion de idiomas con dgraph`, err);
        }
    }
    // -------------------------------------------------------------------------------------------------------------------
    // sincronizar plataformas en dgraph ------------------------------------------------------------------------------------
    if (userUpdate.plataformas !== undefined) {
        try {
            const nombresPlataformas = userUpdate.plataformas.map((p) => p.nombre); // solo nos interesa el nombre no el gamertag
            await (0, plataforma_queries_1.sincronizarPlataformasUsuario)(mongoId, nombresPlataformas);
        }
        catch (err) {
            console.error(`usuario ${mongoId} actualizado en mongo pero FALLO la sincronizacion de plataformas con dgraph`, err);
        }
    }
    // ---------------------------------------------------------------------------------------------------------------------
    if (userUpdate.juegos_activos !== undefined) {
        try {
            const idsJuegos = userUpdate.juegos_activos.map((j) => j.juego_id.toString());
            await (0, juego_queries_1.sincronizarJuegosUsuario)(mongoId, idsJuegos);
        }
        catch (err) {
            console.error(`usuario ${mongoId} actualizado en mongo pero FALLO la sincronizacion de juegos con dgraph`, err);
        }
    }
}
