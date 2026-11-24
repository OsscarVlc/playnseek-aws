import { Types } from 'mongoose';
import { User } from '../database/mongo/models/user.model';
import { Juego } from '../database/mongo/models/juego.model';
import { IUser } from '../types/user.types';
import {
    asegurarUsuarioEnDgraph,
    CamposUsuarioDgraph,
} from '../database/dgraph/queries/user.queries';
import { asegurarJuegoEnDgraph } from '../database/dgraph/queries/juego.queries';
import { buscarOCrearIdioma } from '../database/dgraph/queries/idioma.queries';
import { buscarOCrearPlataforma } from '../database/dgraph/queries/plataforma.queries';
import { restaurarDatosUsuarioEnDgraph } from '../database/dgraph/queries/recuperacion.queries';

interface UsuarioRecuperable extends IUser {
    _id: Types.ObjectId;
}

interface FalloRecuperacion {
    mongoId: string;
    mensaje: string;
}

interface ResultadoLote {
    procesados: number;
    recuperados: number;
    errores: FalloRecuperacion[];
    siguienteCursor: string | null;
}

/**
 * Selecciona los datos básicos del usuario que utiliza Dgraph.
 */
function obtenerCamposBasicos(usuario: IUser): CamposUsuarioDgraph {
    const campos: CamposUsuarioDgraph = { nombre: usuario.nombre };

    if (usuario.edad !== undefined) campos.edad = usuario.edad;
    if (usuario.sexo !== undefined) campos.genero = usuario.sexo;
    if (usuario.rol !== undefined) campos.rol = usuario.rol;

    return campos;
}

/**
 * Asegura que existan los idiomas y devuelve sus UID sin duplicados.
 */
async function prepararIdiomas(usuario: IUser): Promise<string[]> {
    const uids: string[] = [];

    for (const idioma of new Set(usuario.idiomas ?? [])) {
        uids.push(await buscarOCrearIdioma(idioma));
    }

    return uids;
}

/**
 * Asegura que existan las plataformas y devuelve sus UID sin duplicados.
 */
async function prepararPlataformas(usuario: IUser): Promise<string[]> {
    const nombres = (usuario.plataformas ?? []).map((plataforma) => plataforma.nombre);
    const uids: string[] = [];

    for (const nombre of new Set(nombres)) {
        uids.push(await buscarOCrearPlataforma(nombre));
    }

    return uids;
}

/**
 * Recupera los juegos referenciados por el usuario usando sus datos de MongoDB.
 */
async function prepararJuegos(usuario: IUser): Promise<string[]> {
    const ids = (usuario.juegos_activos ?? []).map((juego) => juego.juego_id.toString());
    const uids: string[] = [];

    for (const mongoId of new Set(ids)) {
        const juego = await Juego.findById(mongoId).select('titulo').lean();

        if (!juego) {
            throw new Error(`El usuario referencia un juego inexistente en MongoDB: ${mongoId}`);
        }

        const resultado = await asegurarJuegoEnDgraph(mongoId, juego.titulo);
        uids.push(resultado.uid);
    }

    return uids;
}

/**
 * Prepara los nodos necesarios y restaura los datos y relaciones del usuario.
 */
async function recuperarUsuario(usuario: UsuarioRecuperable): Promise<void> {
    const mongoId = usuario._id.toString();

    const nodoUsuario = await asegurarUsuarioEnDgraph(mongoId, usuario.nombre);
    const idiomaUids = await prepararIdiomas(usuario);
    const plataformaUids = await prepararPlataformas(usuario);
    const juegoUids = await prepararJuegos(usuario);

    await restaurarDatosUsuarioEnDgraph({
        usuarioUid: nodoUsuario.uid,
        campos: obtenerCamposBasicos(usuario),
        idiomaUids,
        plataformaUids,
        juegoUids,
    });
}

/**
 * Convierte un error desconocido en un mensaje para el reporte.
 */
function obtenerMensajeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Valida las opciones del lote antes de consultar las bases de datos.
 */
function validarOpciones(limite: number, cursor?: string): void {
    if (!Number.isInteger(limite) || limite < 1 || limite > 100) {
        throw new Error('El límite debe ser un entero entre 1 y 100');
    }

    if (cursor !== undefined && !/^[0-9a-fA-F]{24}$/.test(cursor)) {
        throw new Error('El cursor debe ser un ObjectId válido');
    }
}

/**
 * Recupera un lote de usuarios activos sin modificar MongoDB.
 * Devuelve un cursor para continuar con el siguiente lote.
 */
export async function recuperarLoteUsuariosDgraph(
    limite: number = 20,
    cursor?: string,
): Promise<ResultadoLote> {
    validarOpciones(limite, cursor);

    const filtro: {
        isActive: boolean;
        _id?: { $gt: Types.ObjectId };
    } = { isActive: true };

    if (cursor !== undefined) {
        filtro._id = { $gt: new Types.ObjectId(cursor) };
    }

    const usuarios = await User.find(filtro)
        .select('_id nombre edad sexo rol idiomas plataformas juegos_activos')
        .sort({ _id: 1 })
        .limit(limite + 1)
        .lean();

    const hayMas = usuarios.length > limite;
    const lote = usuarios.slice(0, limite);

    const resultado: ResultadoLote = {
        procesados: 0,
        recuperados: 0,
        errores: [],
        siguienteCursor: null,
    };

    for (const usuario of lote) {
        resultado.procesados += 1;

        try {
            await recuperarUsuario(usuario);
            resultado.recuperados += 1;
        } catch (error) {
            const fallo = {
                mongoId: usuario._id.toString(),
                mensaje: obtenerMensajeError(error),
            };

            resultado.errores.push(fallo);
            console.error('Error recuperando usuario en Dgraph:', fallo);
        }
    }

    if (hayMas) {
        resultado.siguienteCursor = lote[lote.length - 1]._id.toString();
    }

    return resultado;
}