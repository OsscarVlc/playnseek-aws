import * as dgraph from 'dgraph-js';
import { dgraphClient } from '../../../config/dgraph.config';
import { CamposUsuarioDgraph } from './user.queries';

export interface DatosRecuperacionUsuario {
    usuarioUid: string;
    campos: CamposUsuarioDgraph;
    idiomaUids: string[];
    plataformaUids: string[];
    juegoUids: string[];
}

/**
 * Convierte los UID en referencias a nodos y elimina referencias repetidas.
 */
function crearReferencias(uids: string[]): { uid: string }[] {
    return [...new Set(uids)].map((uid) => ({ uid }));
}

/**
 * Restaura los datos básicos y reemplaza las relaciones del usuario
 * dentro de una misma transacción.
 */
export async function restaurarDatosUsuarioEnDgraph(
    datos: DatosRecuperacionUsuario,
): Promise<void> {
    const txn = dgraphClient.newTxn();

    try {
        // Preparamos las referencias antes de modificar las relaciones.
        const idiomas = crearReferencias(datos.idiomaUids);
        const plataformas = crearReferencias(datos.plataformaUids);
        const juegos = crearReferencias(datos.juegoUids);

        // Quitamos las relaciones anteriores sin confirmar todavía la transacción.
        const borrarRelaciones = new dgraph.Mutation();
        borrarRelaciones.setDeleteJson({
            uid: datos.usuarioUid,
            habla: null,
            juega_en: null,
            usuario_juega: null,
        });

        await txn.mutate(borrarRelaciones);

        // Guardamos los datos y las relaciones correspondientes a MongoDB.
        const restaurarDatos = new dgraph.Mutation();
        restaurarDatos.setSetJson({
            uid: datos.usuarioUid,
            ...datos.campos,
            habla: idiomas,
            juega_en: plataformas,
            usuario_juega: juegos,
        });

        await txn.mutate(restaurarDatos);

        // Confirmamos ambas mutaciones juntas.
        await txn.commit();
    } finally {
        // Liberamos la transacción; los cambios sin confirmar se descartan.
        await txn.discard();
    }
}