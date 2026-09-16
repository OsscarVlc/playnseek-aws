import { Response } from 'express';
import { AuthRequest } from '../types/auth-request';
import { HttpStatus } from '../types/https-status';
import { Reporte } from '../database/mongo/models/reporte.model';
import { IReporte } from '../types/reporte.types';
import { estadoReporte } from '../types/reporte.types';

const MSG_NO_AUTENTICADO = 'No autenticado';
const MSG_ID_INVALIDO = 'Id Invalido';
const MSG_ERROR_SERVIDOR = 'Error del servidor';

interface FiltroReporte {
    estado?: estadoReporte;
}

export async function crearReporte(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: MSG_NO_AUTENTICADO });
        }

        const { reportado_id, motivo, descripcion, grupo_id, post_id, comentario_id } = req.body;

        if (!reportado_id) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'El ID del usuario reportado es requerido' });
        }

        if (!motivo) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'El motivo del reporte es requerido' });
        }

        if (reportado_id === req.user._id.toString()) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'No puedes reportarte a ti mismo' });
        }

        const nuevoReporte = new Reporte({
            remitente_id: req.user._id,
            reportado_id,
            motivo,
            descripcion,
            grupo_id,
            post_id,
            comentario_id,
        });

        const doc = await nuevoReporte.save();
        console.log('Reporte creado: ' + doc._id);

        res.status(HttpStatus.CREATED).json({
            message: 'Reporte creado exitosamente',
            reporte: doc,
        });
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: MSG_ID_INVALIDO });
        }
        res.status(HttpStatus.SERVER_ERROR).json({ message: MSG_ERROR_SERVIDOR });
    }
}

export async function listarReportes(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: MSG_NO_AUTENTICADO });
        }

        const pagina = Number(req.query.pagina) || 1;
        const limite = Number(req.query.limite) || 10;
        const skip = (pagina - 1) * limite;

        const filtro: FiltroReporte = {};
        if (req.query.estado) {
            filtro.estado = req.query.estado as estadoReporte;
        }

        const reportes = await Reporte.find(filtro)
            .skip(skip)
            .limit(limite)
            .populate('remitente_id', 'nombre')
            .populate('reportado_id', 'nombre');
        const total = await Reporte.countDocuments(filtro);

        res.json({
            data: reportes,
            pagina,
            totalPaginas: Math.ceil(total / limite),
            total,
        });
    } catch (err) {
        console.log(err);
        res.status(HttpStatus.SERVER_ERROR).json({ message: MSG_ERROR_SERVIDOR });
    }
}

export async function obtenerReporte(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: MSG_NO_AUTENTICADO });
        }

        const { id } = req.params;
        const reporte = await Reporte.findById(id);

        if (!reporte) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'No se encontro el reporte' });
        }

        return res.json(reporte);
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: MSG_ID_INVALIDO });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({ message: MSG_ERROR_SERVIDOR });
    }
}

export async function actualizarReporte(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: MSG_NO_AUTENTICADO });
        }

        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'El estado es requerido' });
        }

        const reporte = await Reporte.findById(id);
        if (!reporte) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'No se encontro el reporte' });
        }

        const reporteUpdate: Partial<IReporte> = { estado };
        const reporteActualizado = await Reporte.findByIdAndUpdate(id, reporteUpdate, { new: true });

        return res.json(reporteActualizado);
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: MSG_ID_INVALIDO });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({ message: MSG_ERROR_SERVIDOR });
    }
}
