import { Response } from 'express';
import { AuthRequest } from '../types/auth-request';
import { HttpStatus } from '../types/https-status';
import { Solicitud } from '../database/mongo/models/solicitud.model';
import { EstadoSolicitud } from '../types/solicitud.types';
import { crearMatchEnDgraph } from '../database/dgraph/queries/match.queries';

export async function enviarSolicitud(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const deUsuario = req.user._id.toString();
        const { aUsuario } = req.body;

        if (!aUsuario) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'aUsuario es requerido' });
        }

        if (aUsuario === deUsuario) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'No puedes enviarte una solicitud a ti mismo' });
        }

        // ¿Ya le mandé una solicitud pendiente a esta persona?
        const solicitudExistente = await Solicitud.findOne({
            de_usuario: deUsuario,
            a_usuario: aUsuario,
            estado: EstadoSolicitud.PENDIENTE,
        });

        if (solicitudExistente) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Ya le enviaste una solicitud a este usuario' });
        }

        // ¿Esta persona ya me mandó una solicitud pendiente a mí? -> auto-match mutuo
        const solicitudInversa = await Solicitud.findOne({
            de_usuario: aUsuario,
            a_usuario: deUsuario,
            estado: EstadoSolicitud.PENDIENTE,
        });

        if (solicitudInversa) {
            solicitudInversa.estado = EstadoSolicitud.ACEPTADA;
            solicitudInversa.fecha_respuesta = new Date();
            await solicitudInversa.save();

            try {
                await crearMatchEnDgraph(deUsuario, aUsuario);
            } catch (err) {
                console.error(`Match auto-aceptado en Mongo pero FALLÓ la sincronización con Dgraph:`, err);
            }

            return res.json({ message: '¡Es un match! Ambos se enviaron solicitud mutuamente', match: true });
        }

        // No hay nada pendiente entre ambos: creamos la solicitud nueva
        const nuevaSolicitud = new Solicitud({
            de_usuario: deUsuario,
            a_usuario: aUsuario,
        });
        const doc = await nuevaSolicitud.save();
        console.log('Solicitud creada: ' + doc._id);

        return res.status(HttpStatus.CREATED).json({ message: 'Solicitud enviada exitosamente', solicitud: doc });
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}

export async function listarSolicitudesRecibidas(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const solicitudes = await Solicitud.find({
            a_usuario: req.user._id,
            estado: EstadoSolicitud.PENDIENTE,
        }).populate('de_usuario', 'nombre foto_perfil idiomas plataformas');

        return res.json({ data: solicitudes });
    } catch (err) {
        console.log(err);
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}

export async function responderSolicitud(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const { id } = req.params; // id de la solicitud
        const { respuesta } = req.body; // "aceptar" o "rechazar"

        if (respuesta !== 'aceptar' && respuesta !== 'rechazar') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'respuesta debe ser "aceptar" o "rechazar"' });
        }

        const solicitud = await Solicitud.findById(id);

        if (!solicitud) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'No se encontro la solicitud' });
        }

        if (solicitud.a_usuario.toString() !== req.user._id.toString()) {
            return res
                .status(HttpStatus.FORBIDDEN)
                .json({ message: 'No puedes responder una solicitud que no es tuya' });
        }

        if (solicitud.estado !== EstadoSolicitud.PENDIENTE) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Esta solicitud ya fue respondida' });
        }

        solicitud.estado = respuesta === 'aceptar' ? EstadoSolicitud.ACEPTADA : EstadoSolicitud.RECHAZADA;
        solicitud.fecha_respuesta = new Date();
        await solicitud.save();

        if (respuesta === 'aceptar') {
            try {
                await crearMatchEnDgraph(solicitud.de_usuario.toString(), solicitud.a_usuario.toString());
            } catch (err) {
                console.error(`Match aceptado en Mongo pero FALLÓ la sincronización con Dgraph:`, err);
            }
            return res.json({ message: '¡Es un match!' });
        }

        return res.json({ message: 'Solicitud rechazada' });
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}

export async function listarSolicitudesEnviadas(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const solicitudes = await Solicitud.find({
            de_usuario: req.user._id,
        }).populate('a_usuario', 'nombre foto_perfil');

        return res.json({ data: solicitudes });
    } catch (err) {
        console.log(err);
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}

export async function cancelarSolicitud(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const { id } = req.params;
        const usuarioId = req.user._id.toString();

        const solicitud = await Solicitud.findById(id);

        if (!solicitud) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'No se encontro la solicitud' });
        }

        if (solicitud.de_usuario.toString() !== usuarioId) {
            return res
                .status(HttpStatus.FORBIDDEN)
                .json({ message: 'No puedes cancelar una solicitud que no enviaste tú' });
        }

        if (solicitud.estado !== EstadoSolicitud.PENDIENTE) {
            return res
                .status(HttpStatus.BAD_REQUEST)
                .json({ message: 'Solo se pueden cancelar solicitudes pendientes' });
        }

        solicitud.estado = EstadoSolicitud.CANCELADA;
        solicitud.fecha_respuesta = new Date();
        await solicitud.save();

        return res.json({ message: 'Solicitud cancelada exitosamente' });
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
