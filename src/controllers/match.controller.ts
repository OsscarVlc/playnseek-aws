import { Response } from 'express';
import { AuthRequest } from '../types/auth-request';
import { HttpStatus } from '../types/https-status';
import { obtenerMatchesDeUsuario } from '../database/dgraph/queries/match.queries';
import { User } from '../database/mongo/models/user.model';
import { eliminarMatchEntreUsuarios } from '../database/dgraph/queries/match.queries';

export async function listarMisMatches(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const mongoId = req.user._id.toString();
        const matches = await obtenerMatchesDeUsuario(mongoId);

        // dgraph solo nos da mongo_id y nombre del compañero, traemos foto_perfil desde mongo
        const idsCompaneros = matches.map((m) => m.companero.mongo_id);
        const perfiles = await User.find({ _id: { $in: idsCompaneros } })
            .select('foto_perfil')
            .lean();

        const fotosPorId = new Map(perfiles.map((p) => [p._id.toString(), p.foto_perfil]));

        const matchesEnriquecidos = matches.map((m) => ({
            fecha: m.fecha,
            companero: {
                mongo_id: m.companero.mongo_id,
                nombre: m.companero.nombre,
                foto_perfil: fotosPorId.get(m.companero.mongo_id),
            },
        }));

        return res.json({ data: matchesEnriquecidos });
    } catch (err) {
        console.log(err);
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}

export async function eliminarMatch(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const miId = req.user._id.toString();
        const { id: companeroId } = req.params;

        if (typeof companeroId !== 'string') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id de usuario inválido' });
        }

        await eliminarMatchEntreUsuarios(miId, companeroId);

        return res.json({ message: 'Match eliminado' });
    } catch (err) {
        console.log(err);
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
