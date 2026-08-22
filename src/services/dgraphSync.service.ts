import { actualizarUsuarioEnDgraph, CamposUsuarioDgraph } from '../database/dgraph/queries/user.queries';
import { sincronizarIdiomasUsuario } from '../database/dgraph/queries/idioma.queries';
import { sincronizarPlataformasUsuario } from '../database/dgraph/queries/plataforma.queries';
import { sincronizarJuegosUsuario } from '../database/dgraph/queries/juego.queries';
import { IUser } from '../types/user.types';

// centraliza toda la sincronizacion de un usuario con dgraph tras una actualizacion
// nunca lanza errores hacia arriba, cada pieza falla en silencio (solo loggea)
// porque un fallo de dgraph no debe romper una actualizacion exitosa en mongo
export async function sincronizarUsuarioConDgraph(mongoId: string, userUpdate: Partial<IUser>) {
    // actualizar datos basicos en dgraph -----------------------------------------------------------------------------
    try {
        const camposDgraph: CamposUsuarioDgraph = {}; // creamos un objeto vacio
        if (userUpdate.nombre !== undefined) camposDgraph.nombre = userUpdate.nombre; // pasamos los datos que nos interesan
        if (userUpdate.edad !== undefined) camposDgraph.edad = userUpdate.edad; // pasamos los datos que nos interesan
        if (userUpdate.sexo !== undefined) camposDgraph.genero = userUpdate.sexo; // pasamos los datos que nos interesan
        if (userUpdate.rol !== undefined) camposDgraph.rol = userUpdate.rol; // pasamos los datos que nos interesan

        if (Object.keys(camposDgraph).length > 0) {
            // verificamos si hay algo que actualizar
            await actualizarUsuarioEnDgraph(mongoId, camposDgraph); // si los hay los mandamos a la funcion
        }
    } catch (err) {
        console.error(`usuario ${mongoId} actualizado en mongo pero FALLO la sincronizacion con dgraph`, err);
    }
    // -----------------------------------------------------------------------------------------------------------------

    // sincronizar idiomas en dgraph ------------------------------------------------------------------------------------
    if (userUpdate.idiomas !== undefined) {
        try {
            await sincronizarIdiomasUsuario(mongoId, userUpdate.idiomas);
        } catch (err) {
            console.error(
                `usuario ${mongoId} actualizado en mongo pero FALLO la sincronizacion de idiomas con dgraph`,
                err,
            );
        }
    }
    // -------------------------------------------------------------------------------------------------------------------

    // sincronizar plataformas en dgraph ------------------------------------------------------------------------------------
    if (userUpdate.plataformas !== undefined) {
        try {
            const nombresPlataformas = userUpdate.plataformas.map((p) => p.nombre); // solo nos interesa el nombre no el gamertag
            await sincronizarPlataformasUsuario(mongoId, nombresPlataformas);
        } catch (err) {
            console.error(
                `usuario ${mongoId} actualizado en mongo pero FALLO la sincronizacion de plataformas con dgraph`,
                err,
            );
        }
    }
    // ---------------------------------------------------------------------------------------------------------------------
    if (userUpdate.juegos_activos !== undefined) {
        try {
            const idsJuegos = userUpdate.juegos_activos.map((j) => j.juego_id.toString());
            await sincronizarJuegosUsuario(mongoId, idsJuegos);
        } catch (err) {
            console.error(
                `usuario ${mongoId} actualizado en mongo pero FALLO la sincronizacion de juegos con dgraph`,
                err,
            );
        }
    }
}
