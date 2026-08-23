import { Request, Response } from 'express';
import { buscarJuegoEnRAWG, obtenerDetalleJuegoRAWG, transformarJuegoRAWG } from '../services/juego.services';
import { HttpStatus } from '../types/https-status';
import { Juego } from '../database/mongo/models/juego.model';
import { IJuego } from '../types/juego.types';
import { crearJuegoEnDgraph, actualizarJuegoEnDgraph } from '../database/dgraph/queries/juego.queries';

export async function previsualizarJuego(req: Request, res: Response) {
    try {
        const { nombre } = req.query;

        if (!nombre || typeof nombre !== 'string') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'El parametro nombre es requerido' });
        }

        const resultados = await buscarJuegoEnRAWG(nombre);
        return res.json(resultados);
    } catch (err) {
        console.log(err);
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error al buscar el juego' });
    }
}

export async function crearJuego(req: Request, res: Response) {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'No ingresaste un ID',
            });
        } else {
            const juegoExistente = await Juego.findOne({ id_api: id });

            if (juegoExistente) {
                if (juegoExistente.activo) {
                    return res.status(HttpStatus.BAD_REQUEST).json({
                        message: 'Este juego ya existe',
                    });
                } else {
                    // Si el juego existe pero esta inactivo, lo reactivamos
                    juegoExistente.activo = true;
                    const doc = await juegoExistente.save();
                    console.log('Juego reactivado: ' + doc._id);

                    return res.json({
                        message: 'Juego reactivado exitosamente',
                        juego: {
                            _id: doc._id,
                            titulo: doc.titulo,
                            imagen: doc.imagen,
                            generos: doc.generos,
                            plataformas: doc.plataformas,
                            id_api: doc.id_api,
                        },
                    });
                }
            }

            const detalle = await obtenerDetalleJuegoRAWG(id);
            const juegoTranformado = transformarJuegoRAWG(detalle);

            const newJuego = new Juego({
                titulo: juegoTranformado.titulo,
                imagen: juegoTranformado.imagen,
                generos: juegoTranformado.generos,
                plataformas: juegoTranformado.plataformas,
                id_api: juegoTranformado.id_api,
            });

            const doc = await newJuego.save();
            console.log('Juego creado: ' + doc._id);

            // Sincronizar con Dgraph (no bloquea el registro si falla) --------------------------------------------------
            try {
                await crearJuegoEnDgraph(doc._id.toString(), doc.titulo);
            } catch (err) {
                console.error(`Juego ${doc._id} creado en Mongo pero FALLÓ la sincronización con Dgraph:`, err);
            }
            // -----------------------------------------------------------------------------------------------------------

            res.status(HttpStatus.CREATED).json({
                message: 'Juego creado exitosamente',
                juego: {
                    _id: doc._id,
                    titulo: doc.titulo,
                    imagen: doc.imagen,
                    generos: doc.generos,
                    plataformas: doc.plataformas,
                    id_api: doc.id_api,
                },
            });
        }
    } catch (err) {
        console.log(err);
        res.status(HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
    }
}

export async function listarJuegos(req: Request, res: Response) {
    const pagina = Number(req.query.pagina) || 1;
    const limite = Number(req.query.limite) || 10;
    const skip = (pagina - 1) * limite;
    try {
        const juegos = await Juego.find({ activo: true }).skip(skip).limit(limite);
        const totalJuegos = await Juego.countDocuments({ activo: true });

        res.json({
            data: juegos,
            pagina,
            totalPaginas: Math.ceil(totalJuegos / limite),
            totalJuegos,
        });
    } catch (err) {
        console.log(err);
        res.status(HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
    }
}

export async function obtenerJuego(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const resultado = await Juego.findById(id);
        if (!resultado || !resultado.activo) {
            return res.status(HttpStatus.NOT_FOUND).json({
                message: 'No se encontro el juego',
            });
        }

        return res.send(resultado);
    } catch (err) {
        console.log(err);
        if ((err as Error).name == 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Id Invalido',
            });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
    }
}

export async function actualizarJuego(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { titulo, imagen, generos, plataformas, id_api } = req.body;

        if (id_api !== undefined) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'No se puede modificar id_api',
            });
        }
        const juegoUpdate: Partial<IJuego> = {};

        if (titulo !== undefined) juegoUpdate.titulo = titulo;
        if (imagen !== undefined) juegoUpdate.imagen = imagen;
        if (generos !== undefined) juegoUpdate.generos = generos;
        if (plataformas !== undefined) juegoUpdate.plataformas = plataformas;

        const juegoActualizado = await Juego.findByIdAndUpdate(id, juegoUpdate, { new: true });
        if (!juegoActualizado) {
            return res.status(HttpStatus.NOT_FOUND).json({
                message: 'No se encontro el juego',
            });
        }

        // Actualizar juego en dgraph ---------------------------------------------------------------------------------------------
        if (juegoUpdate.titulo !== undefined) {
            try {
                await actualizarJuegoEnDgraph(id as string, { nombre_juego: juegoUpdate.titulo });
            } catch (err) {
                console.error(`Juego ${id} actualizado en Mongo pero FALLÓ la sincronización con Dgraph:`, err);
            }
        }
        // ------------------------------------------------------------------------------------------------------------------------

        return res.json(juegoActualizado);
    } catch (err) {
        console.log(err);
        if ((err as Error).name == 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Id Invalido',
            });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
    }
}

export async function eliminarJuego(req: Request, res: Response) {
    try {
        const { id } = req.params;

        const juego = await Juego.findById(id);

        if (!juego) {
            return res.status(HttpStatus.NOT_FOUND).json({
                message: 'No se encontro el juego',
            });
        }

        if (!juego.activo) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'El juego ya estaba inactivo',
            });
        }

        juego.activo = false;
        const juegoEliminado = await juego.save();

        return res.json({ message: 'Juego eliminado (marcado inactivo) correctamente', juego: juegoEliminado });
    } catch (err) {
        console.log(err);
        if ((err as Error).name == 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Id Invalido',
            });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
    }
}
