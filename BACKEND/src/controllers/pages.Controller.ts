import { Request, Response } from 'express';
import { User } from '../database/mongo/models/user.model';
import { AuthRequest } from '../types/auth-request';
import { Juego } from '../database/mongo/models/juego.model';
import { Grupo } from '../database/mongo/models/grupo.model';
import { Idioma, ModoDeJuego, Plataforma } from '../types/user.types';
import { confirmarCuentaCore } from '../services/confirmacion.service';
import { NextFunction } from 'express';
import { Types } from 'mongoose';

export function mostrarIndex(req: Request, res: Response) {
    res.render('index'); // res.locals.estaLogueado ya está disponible en la vista sin pasarlo aquí
}

export function mostrarLogin(req: Request, res: Response) {
    const mensaje =
        req.query.registrado === 'true'
            ? 'Cuenta creada. Revisa tu correo para confirmarla antes de iniciar sesión.'
            : undefined;
    res.render('login', { mensaje });
}

export function mostrarRegister(req: Request, res: Response) {
    res.render('register'); // solo mostramos el formulario
}

export function logout(req: Request, res: Response) {
    res.clearCookie('token');
    res.redirect('/');
}

export async function mostrarPerfil(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.redirect('/login');
        }

        const usuario = await User.findById(req.user._id)
            .select('-contrasena_hash')
            .populate('juegos_activos.juego_id', 'titulo')
            .populate('juegos_pasados', 'titulo')
            .lean();
        const token = req.cookies.token;

        const zonasHorarias = ['GMT-8', 'GMT-7', 'GMT-6', 'GMT-5', 'GMT-4', 'GMT-3'];
        const horariosJuego = ['mañana', 'tarde', 'noche'];
        const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

        res.render('perfil', {
            usuario,
            token,
            idiomas: Object.values(Idioma),
            modosJuego: Object.values(ModoDeJuego),
            plataformas: Object.values(Plataforma),
            zonasHorarias,
            horariosJuego,
            diasSemana,
        });
    } catch (err) {
        console.log(err);
        return res.redirect('/login');
    }
}

export async function mostrarJuegos(req: AuthRequest, res: Response) {
    try {
        const juegos = await Juego.find({ activo: true }).lean();
        res.render('juegos', { juegos, token: req.cookies.token });
    } catch (err) {
        console.log(err);
        res.render('juegos', { juegos: [], error: 'No se pudieron cargar los juegos' });
    }
}

export async function mostrarDetalleJuego(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;

        if (typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
            return next();
        }

        const juego = await Juego.findById(id).lean();

        if (!juego || !juego.activo) {
            return res.render('juego-detalle', { error: 'No se encontró el juego' });
        }

        let esActivo = false;
        let esPasado = false;
        let buscaEquipo = false;

        if (typeof req.user === 'object' && req.user !== null) {
            const usuario = await User.findById(req.user._id).lean();
            const entrada = (usuario?.juegos_activos || []).find((j) => j.juego_id.toString() === id);
            if (entrada) {
                esActivo = true;
                buscaEquipo = entrada.busca_equipo;
            }
            esPasado = (usuario?.juegos_pasados || []).some((jId) => jId.toString() === id);
        }

        res.render('juego-detalle', {
            juego,
            esActivo,
            esPasado,
            buscaEquipo,
            juegoId: id,
            token: req.cookies.token,
        });
    } catch (err) {
        console.log(err);
        res.render('juego-detalle', { error: 'No se encontró el juego' });
    }
}

interface FiltroGrupo {
    activo: boolean;
    integrantes?: string;
}

export async function mostrarGrupos(req: AuthRequest, res: Response) {
    try {
        const soloMios = req.query.misGrupos === 'true';
        const usuario = res.locals.usuario;

        const filtro: FiltroGrupo = { activo: true };

        if (soloMios && usuario) {
            filtro.integrantes = usuario._id.toString();
        }

        const grupos = await Grupo.find(filtro).lean();
        const token = req.cookies.token;

        res.render('grupos', { grupos, soloMios, token });
    } catch (err) {
        console.log(err);
        res.render('grupos', { grupos: [], error: 'No se pudieron cargar los grupos' });
    }
}

interface IntegrantePoblado {
    _id: Types.ObjectId;
    nombre: string;
    foto_perfil: string;
}

export async function mostrarDetalleGrupo(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const grupo = await Grupo.findById(id)
            .populate<{ integrantes: IntegrantePoblado[] }>('integrantes', 'nombre foto_perfil')
            .lean();

        if (!grupo || !grupo.activo) {
            return res.render('grupo-detalle', { error: 'No se encontro el grupo' });
        }

        let miUsuarioId: string | null = null;
        let esIntegrante = false;
        let esLider = false;

        if (typeof req.user === 'object' && req.user !== null) {
            miUsuarioId = req.user._id.toString();
            const esAdmin = req.user.rol === 'administrador';
            const perteneceAlGrupo = (grupo.integrantes || []).some((i) => i._id.toString() === miUsuarioId);
            esIntegrante = perteneceAlGrupo || esAdmin;
            esLider = grupo.lider_id.toString() === miUsuarioId;
        }

        res.render('grupo-detalle', {
            grupo,
            esIntegrante,
            esLider,
            estaLogueado: miUsuarioId !== null,
            token: req.cookies.token,
            grupoId: id,
            miUsuarioId,
        });
    } catch (err) {
        console.log(err);
        res.render('grupo-detalle', { error: 'No se encontro el grupo' });
    }
}

export async function mostrarConfirmacion(req: Request, res: Response) {
    try {
        const { token } = req.params;
        if (typeof token !== 'string') {
            return res.render('confirmacion', { error: 'Token inválido' });
        }

        await confirmarCuentaCore(token);

        return res.render('confirmacion', { exito: true });
    } catch (err) {
        console.log(err);
        return res.render('confirmacion', { error: 'Token de confirmación inválido o expirado' });
    }
}

export async function mostrarMatch(req: AuthRequest, res: Response) {
    if (typeof req.user === 'string' || !req.user) {
        return res.redirect('/login');
    }
    const token = req.cookies.token;
    res.render('match', { token });
}

export async function mostrarChatPrivado(req: AuthRequest, res: Response) {
    if (typeof req.user === 'string' || !req.user) {
        return res.redirect('/login');
    }

    const { id } = req.params;
    const otroUsuario = await User.findById(id).select('nombre foto_perfil').lean();

    if (!otroUsuario) {
        return res.render('chat-privado', { error: 'Usuario no encontrado' });
    }

    const token = req.cookies.token;
    res.render('chat-privado', {
        otroUsuario,
        token,
        otroUsuarioId: id,
        miUsuarioId: req.user._id.toString(), // nuevo
    });
}

export async function mostrarAdminUsuarios(req: AuthRequest, res: Response) {
    if (typeof req.user === 'string' || !req.user) {
        return res.redirect('/login');
    }

    const usuarios = await User.find({ isActive: true }).select('-contrasena_hash').lean();
    const token = req.cookies.token;

    res.render('admin-usuarios', { usuarios, token, miUsuarioId: req.user._id.toString() });
}

export function mostrarModeracionReportes(req: AuthRequest, res: Response) {
    if (typeof req.user === 'string' || !req.user) {
        return res.redirect('/login');
    }
    res.render('moderacion-reportes');
}
