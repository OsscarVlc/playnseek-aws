"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crearGrupo = crearGrupo;
exports.listarGrupos = listarGrupos;
exports.obtenerGrupo = obtenerGrupo;
exports.actualizarGrupo = actualizarGrupo;
exports.eliminarGrupo = eliminarGrupo;
exports.unirseAGrupo = unirseAGrupo;
exports.salirDeGrupo = salirDeGrupo;
exports.expulsarIntegrante = expulsarIntegrante;
exports.transferirLiderazgo = transferirLiderazgo;
const https_status_1 = require("../types/https-status");
const grupo_model_1 = require("../database/mongo/models/grupo.model");
const user_types_1 = require("../types/user.types");
const mongoose_1 = require("mongoose");
const comunidad_queries_1 = require("../database/dgraph/queries/comunidad.queries");
// ---------- Constantes de mensajes (evita strings repetidos) ----------
const MSG_NO_AUTENTICADO = 'No autenticado';
const MSG_GRUPO_NO_ENCONTRADO = 'No se encontro el grupo';
const MSG_ID_INVALIDO = 'Id Invalido';
const MSG_ERROR_SERVIDOR = 'Error del servidor';
// ---------- Funciones auxiliares (reducen complejidad y duplicación) ----------
/**
 * Maneja los errores de forma centralizada: distingue CastError (id con formato
 * inválido) de cualquier otro error inesperado del servidor.
 */
function manejarErrorControlador(err, res) {
    console.log(err);
    if (err.name === 'CastError') {
        return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: MSG_ID_INVALIDO });
    }
    return res.status(https_status_1.HttpStatus.SERVER_ERROR).json({ message: MSG_ERROR_SERVIDOR });
}
/**
 * Verifica que el request tenga un usuario autenticado válido (no string, no undefined).
 * Si no lo tiene, responde 401 y devuelve null; si lo tiene, lo devuelve.
 */
function obtenerUsuarioAutenticado(req, res) {
    // verificamos que no sea string porque esperamos un objeto
    if (typeof req.user === 'string' || !req.user) {
        res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({ message: MSG_NO_AUTENTICADO });
        return null;
    }
    return req.user;
}
/**
 * Busca un grupo por id y verifica que exista y esté activo.
 * Si no cumple, responde 404 y devuelve null.
 */
async function buscarGrupoActivo(id, res) {
    const grupo = await grupo_model_1.Grupo.findById(id); // buscamos el grupo con el id que nos dieron
    if (!grupo || !grupo.activo) {
        res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: MSG_GRUPO_NO_ENCONTRADO });
        return null;
    }
    return grupo;
}
/**
 * Determina si un usuario puede expulsar integrantes de un grupo:
 * solo el líder del grupo, o cualquier administrador.
 */
function puedeExpulsar(liderId, usuario) {
    const esLider = liderId.toString() === usuario._id.toString();
    const esAdmin = usuario.rol === user_types_1.Roles.ADMIN;
    return esLider || esAdmin;
}
/**
 * Sincroniza la expulsión de un integrante con Dgraph.
 * Si falla, registra el error sin impedir la respuesta de éxito.
 */
async function sincronizarExpulsionEnDgraph(usuarioId, grupoId) {
    try {
        await (0, comunidad_queries_1.quitarMiembroComunidad)(usuarioId, grupoId);
    }
    catch (err) {
        console.error(`Integrante expulsado en Mongo pero FALLÓ la sincronización con Dgraph:`, err);
    }
}
// ---------- Controllers ----------
async function crearGrupo(req, res) {
    try {
        const usuario = obtenerUsuarioAutenticado(req, res);
        if (!usuario)
            return;
        const { nombre, descripcion } = req.body; // obtenemos los datos desde el cliente
        if (nombre === undefined) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                message: 'El nombre del grupo es requerido',
            });
        }
        const nuevoGrupo = new grupo_model_1.Grupo({
            // creamos el documento pero todavia no lo guardamos en mongo
            nombre,
            descripcion,
            lider_id: usuario._id,
            integrantes: [usuario._id],
        });
        const doc = await nuevoGrupo.save(); // guardamos el documento en mongo
        console.log('Grupo creado: ' + doc._id);
        try {
            await (0, comunidad_queries_1.crearComunidadEnDgraph)(doc._id.toString(), doc.nombre, doc.fecha_creacion.toISOString());
            await (0, comunidad_queries_1.agregarMiembroComunidad)(usuario._id.toString(), doc._id.toString());
        }
        catch (err) {
            console.error(`Grupo ${doc._id} creado en Mongo pero FALLÓ la sincronización con Dgraph:`, err);
        }
        res.status(https_status_1.HttpStatus.CREATED).json({
            message: 'Grupo creado exitosamente',
            grupo: {
                _id: doc._id,
                nombre: doc.nombre,
                descripcion: doc.descripcion,
                fecha_creacion: doc.fecha_creacion,
                lider_id: doc.lider_id,
                integrantes: doc.integrantes,
            },
        });
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
// no necesitamos saber quien esta autenticado por eso solo request
async function listarGrupos(req, res) {
    try {
        const pagina = Number(req.query.pagina) || 1; // datos del cliente, por defecto 1
        const limite = Number(req.query.limite) || 10; // datos del cliente, por defecto 10
        const skip = (pagina - 1) * limite; // datos del cliente, por defecto 0
        const filtro = req.query.incluirInactivos === 'true' ? {} : { activo: true };
        // preguntamos si quiere que mostremos los inactivos o no
        // filtro= {} significa que no se filtre nada, si se la al else el filtro seria que este activo el grupo
        const grupos = await grupo_model_1.Grupo.find(filtro).skip(skip).limit(limite); // aplicamos lo que nos pidio el usuario
        const total = await grupo_model_1.Grupo.countDocuments(filtro); // contamos los documentos
        res.json({
            data: grupos,
            pagina,
            totalPaginas: Math.ceil(total / limite),
            total,
        });
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
async function obtenerGrupo(req, res) {
    try {
        const { id } = req.params; // obtenemos el parametro de la URL
        const grupo = await buscarGrupoActivo(id, res);
        if (!grupo)
            return;
        return res.json(grupo); // si existe lo devolvemos
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
// volvemos a requerir saber quien es para ver si tiene permisos
async function actualizarGrupo(req, res) {
    try {
        const usuario = obtenerUsuarioAutenticado(req, res);
        if (!usuario)
            return;
        const { id } = req.params; // obtenemos el id que nos enviaron
        const { nombre, descripcion, lider_id, integrantes, activo } = req.body; // recibimos los datos que nos enviaron
        if (lider_id !== undefined || integrantes !== undefined || activo !== undefined) {
            // el cliente no puede modificar estas cosas
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                message: 'No se puede modificar lider_id, integrantes o activo desde aquí',
            });
        }
        const grupo = await buscarGrupoActivo(id, res);
        if (!grupo)
            return;
        if (grupo.lider_id.toString() !== usuario._id.toString()) {
            // verificamos que el usuario autenticado sea el lider del grupo
            return res.status(https_status_1.HttpStatus.FORBIDDEN).json({ message: 'Solo el lider puede editar el grupo' });
        }
        const grupoUpdate = {}; // creamos el objeto de actializacion, con partial porque no le pasaremos todas las propiedades
        if (nombre !== undefined)
            grupoUpdate.nombre = nombre; // si recibimos nombre lo actualizamos
        if (descripcion !== undefined)
            grupoUpdate.descripcion = descripcion; // si recibimos descripcion la actualizamos
        const grupoActualizado = await grupo_model_1.Grupo.findByIdAndUpdate(id, grupoUpdate, { new: true }); // el new true es para devolver el doc actualziado
        return res.json(grupoActualizado);
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
async function eliminarGrupo(req, res) {
    try {
        const usuario = obtenerUsuarioAutenticado(req, res);
        if (!usuario)
            return;
        const { id } = req.params;
        const grupo = await grupo_model_1.Grupo.findById(id);
        if (!grupo) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: MSG_GRUPO_NO_ENCONTRADO });
        }
        if (grupo.lider_id.toString() !== usuario._id.toString()) {
            return res.status(https_status_1.HttpStatus.FORBIDDEN).json({ message: 'Solo el lider puede eliminar el grupo' });
        }
        if (!grupo.activo) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'El grupo ya estaba inactivo' });
        }
        grupo.activo = false; // lo ponemos como inactivo
        await grupo.save(); // guardamos el cambio
        return res.json({ message: 'Grupo eliminado (marcado inactivo) correctamente' });
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
async function unirseAGrupo(req, res) {
    try {
        const usuario = obtenerUsuarioAutenticado(req, res);
        if (!usuario)
            return;
        const { id } = req.params;
        const usuarioId = usuario._id.toString();
        const grupo = await buscarGrupoActivo(id, res);
        if (!grupo)
            return;
        const yaEsMiembro = grupo.integrantes?.some((integranteId) => integranteId.toString() === usuarioId);
        if (yaEsMiembro) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Ya eres miembro de este grupo' });
        }
        grupo.integrantes = [...(grupo.integrantes || []), usuario._id];
        await grupo.save();
        try {
            await (0, comunidad_queries_1.agregarMiembroComunidad)(usuarioId, id);
        }
        catch (err) {
            console.error(`Usuario unido al grupo en Mongo pero FALLÓ la sincronización con Dgraph:`, err);
        }
        return res.json({ message: 'Te uniste al grupo exitosamente', grupo });
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
async function salirDeGrupo(req, res) {
    try {
        const usuario = obtenerUsuarioAutenticado(req, res);
        if (!usuario)
            return;
        const { id } = req.params;
        const usuarioId = usuario._id.toString();
        const grupo = await buscarGrupoActivo(id, res);
        if (!grupo)
            return;
        if (grupo.lider_id.toString() === usuarioId) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                message: 'El lider debe transferir el liderazgo antes de salir del grupo',
            });
        }
        const esMiembro = grupo.integrantes?.some((integranteId) => integranteId.toString() === usuarioId);
        if (!esMiembro) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'No eres miembro de este grupo' });
        }
        grupo.integrantes = grupo.integrantes?.filter((integranteId) => integranteId.toString() !== usuarioId);
        await grupo.save();
        try {
            await (0, comunidad_queries_1.quitarMiembroComunidad)(usuarioId, id);
        }
        catch (err) {
            console.error(`Usuario salió del grupo en Mongo pero FALLÓ la sincronización con Dgraph:`, err);
        }
        return res.json({ message: 'Saliste del grupo exitosamente' });
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
async function expulsarIntegrante(req, res) {
    try {
        const usuario = obtenerUsuarioAutenticado(req, res);
        if (!usuario)
            return;
        const { id } = req.params;
        const { usuarioId } = req.body;
        if (!usuarioId) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'usuarioId es requerido' });
        }
        const grupo = await buscarGrupoActivo(id, res);
        if (!grupo)
            return;
        if (!puedeExpulsar(grupo.lider_id, usuario)) {
            return res.status(https_status_1.HttpStatus.UNAUTHORIZED).json({
                message: 'Solo el lider del grupo o un administrador pueden expulsar integrantes',
            });
        }
        if (usuarioId === grupo.lider_id.toString()) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({
                message: 'No se puede expulsar al lider del grupo',
            });
        }
        const esMiembro = grupo.integrantes?.some((integranteId) => integranteId.toString() === usuarioId);
        if (!esMiembro) {
            return res.status(https_status_1.HttpStatus.NOT_FOUND).json({ message: 'Ese usuario no es miembro de este grupo' });
        }
        grupo.integrantes = grupo.integrantes?.filter((integranteId) => integranteId.toString() !== usuarioId);
        await grupo.save();
        await sincronizarExpulsionEnDgraph(usuarioId, id);
        return res.json({ message: 'Integrante expulsado exitosamente' });
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
async function transferirLiderazgo(req, res) {
    try {
        const usuario = obtenerUsuarioAutenticado(req, res);
        if (!usuario)
            return;
        const { id } = req.params; // id del grupo
        const { nuevoLiderId } = req.body;
        const usuarioId = usuario._id.toString();
        if (!nuevoLiderId) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'nuevoLiderId es requerido' });
        }
        const grupo = await buscarGrupoActivo(id, res);
        if (!grupo)
            return;
        if (grupo.lider_id.toString() !== usuarioId) {
            return res
                .status(https_status_1.HttpStatus.FORBIDDEN)
                .json({ message: 'Solo el lider actual puede transferir el liderazgo' });
        }
        if (nuevoLiderId === usuarioId) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'Ya eres el lider de este grupo' });
        }
        const esMiembro = grupo.integrantes?.some((integranteId) => integranteId.toString() === nuevoLiderId);
        if (!esMiembro) {
            return res.status(https_status_1.HttpStatus.BAD_REQUEST).json({ message: 'El nuevo lider debe ser miembro del grupo' });
        }
        grupo.lider_id = new mongoose_1.Types.ObjectId(nuevoLiderId);
        await grupo.save();
        return res.json({ message: 'Liderazgo transferido exitosamente', grupo });
    }
    catch (err) {
        manejarErrorControlador(err, res);
    }
}
