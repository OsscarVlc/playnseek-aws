import { Request, Response } from 'express';
import { User } from '../database/mongo/models/user.model';
import { HttpStatus } from '../types/https-status';
import bcrypt from 'bcrypt';
import { generateToken, generarTokenConfirmacion } from '../utils/jwt';
import { AuthRequest } from '../types/auth-request';
import { IUser } from '../types/user.types';
import { crearUsuarioEnDgraph } from '../database/dgraph/queries/user.queries'; // para ponerlo en dgraph
import { sincronizarUsuarioConDgraph } from '../services/dgraphSync.service';
import { enviarCorreoConfirmacion } from '../services/email.service';
import { subirImagenACloudinary } from '../services/cloudinary.service';
import { confirmarCuentaCore } from '../services/confirmacion.service';
import { Types } from 'mongoose';
import { sincronizarJuegosUsuario } from '../database/dgraph/queries/juego.queries';

export async function registerUser(req: Request, res: Response) {
    try {
        const { name, email, password } = req.body;

        if (name == undefined || email == undefined || password == undefined) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Campos requeridos faltantes',
            });
        } else {
            const usuarioExistente = await User.findOne({ correo: email });
            if (usuarioExistente) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Este correo ya esta siendo utilizado',
                });
            }
            const passwordHash = await bcrypt.hash(password, 10);

            const newUser = new User({
                nombre: name,
                correo: email,
                contrasena_hash: passwordHash,
            });

            const doc = await newUser.save();
            console.log('Usuario creado: ' + doc._id);

            const tokenConfirmacion = generarTokenConfirmacion(doc._id.toString());
            const urlConfirmacion = `${process.env.APP_URL}/confirmar/${tokenConfirmacion}`;
            try {
                await enviarCorreoConfirmacion(doc.correo, doc.nombre, urlConfirmacion);
            } catch (err) {
                console.error(`Usuario ${doc._id} creado en Mongo pero FALLÓ el envío de correo de confirmación:`, err);
            }

            // Sincronizar con Dgraph (no bloquea el registro si falla) --------------------------------------------------
            try {
                console.log('INICIANDO SINCRONIZACION DGRAPH');
                await crearUsuarioEnDgraph(doc._id.toString(), doc.nombre);
            } catch (err) {
                console.error(`Usuario ${doc._id} creado en Mongo pero FALLÓ la sincronización con Dgraph:`, err);
            }
            // -----------------------------------------------------------------------------------------------------------

            res.status(HttpStatus.CREATED).json({
                message: 'Usuario creado exitosamente',
                user: {
                    _id: doc._id,
                    nombre: doc.nombre,
                    correo: doc.correo,
                    rol: doc.rol,
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

export async function loginUser(req: Request, res: Response) {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ correo: email });

        if (!user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Credenciales inválidas' });
        }

        // Comparar la password ingresada con el hash guardado
        const passwordCorrecta = await bcrypt.compare(password, user.contrasena_hash);

        if (!passwordCorrecta) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Credenciales inválidas' });
        }

        if (!user.correo_confirmado) {
            return res
                .status(HttpStatus.UNAUTHORIZED)
                .json({ message: 'Debes confirmar tu correo antes de iniciar sesión' });
        }

        // Generar token
        const token = generateToken({
            _id: user._id,
            correo: user.correo,
            rol: user.rol,
        });

        return res.json({ token: token });
    } catch (err) {
        console.log(err);
        res.status(HttpStatus.SERVER_ERROR).json({ message: 'Server error' });
    }
}

export function getMe(req: AuthRequest, res: Response) {
    if (typeof req.user === 'string' || !req.user) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
    }

    res.json({
        message: 'Usuario autenticado',
        user: {
            id: req.user._id,
            correo: req.user.correo,
            rol: req.user.rol,
        },
    });
}

export async function actualizarUsuario(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }
        const { rol, password, correo_confirmado, plataformas, ...resto } = req.body;
        // sacar el rol y password del objeto de actualizacion para hacer validaciones
        // todo lo demas se agrupa dentro de resto como un objeto

        if (rol !== undefined) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'No se puede modificar el rol' });
        }
        if (correo_confirmado !== undefined) {
            return res
                .status(HttpStatus.BAD_REQUEST)
                .json({ message: 'No se puede modificar correo_confirmado desde aquí' });
        }

        const userUpdate: Partial<IUser> = { ...resto };
        // se utiliza spread para expandir la variable resto dentro del objeto de userUpdate

        if (password !== undefined) {
            userUpdate.contrasena_hash = await bcrypt.hash(password, 10);
        }

        // plataformas llega como string json desde el formulario (multipart/form-data
        // no soporta estructuras anidadas como nombre y gamertag directamente)
        if (plataformas !== undefined) {
            try {
                userUpdate.plataformas = JSON.parse(plataformas);
            } catch {
                return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Formato de plataformas inválido' });
            }
        }

        // si viene un archivo (gracias a upload.single('foto_perfil') en la ruta)
        // lo subimos a cloudinary y guardamos la url resultante
        if (req.file) {
            userUpdate.foto_perfil = await subirImagenACloudinary(req.file.buffer);
        }

        const usuarioActualizado = await User.findByIdAndUpdate(req.user._id, userUpdate, { new: true }).select(
            '-contrasena_hash',
        );
        // select('-contrasena_hash') es para decirle a mongoose que traiga todo el documento
        // sin contar ese campo y evitar filtrar la contrasena

        if (!usuarioActualizado) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'Usuario no encontrado' });
        }

        // toda la sincronizacion con dgraph (datos basicos, idiomas, plataformas) vive
        // en dgraphSync.service.ts, aqui solo se llama una vez con lo que cambio
        await sincronizarUsuarioConDgraph(req.user._id.toString(), userUpdate);

        return res.json(usuarioActualizado);
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}

export async function eliminarUsuario(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const usuarioEliminado = await User.findById(req.user._id);

        if (!usuarioEliminado) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'Usuario no encontrado' });
        }

        //agregar sufijo de eliminacion
        usuarioEliminado.correo += `_eliminado_${Date.now()}`;
        usuarioEliminado.isActive = false;
        await usuarioEliminado.save();

        return res.json({ message: 'Usuario eliminado exitosamente' });
    } catch (err) {
        console.log(err);
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}

export async function listarUsuarios(req: Request, res: Response) {
    try {
        const pagina = Number(req.query.pagina) || 1;
        const limite = Number(req.query.limite) || 10;
        const skip = (pagina - 1) * limite;

        const usuariosActivos = req.query.incluirInactivos === 'true' ? {} : { isActive: true };

        const usuarios = await User.find(usuariosActivos).select('-contrasena_hash').skip(skip).limit(limite);
        const total = await User.countDocuments(usuariosActivos);

        res.json({
            data: usuarios,
            pagina,
            totalPaginas: Math.ceil(total / limite),
            total,
        });
    } catch (err) {
        console.log(err);
        res.status(HttpStatus.SERVER_ERROR).json({
            message: 'Error del servidor',
        });
    }
}

export async function confirmarCuenta(req: Request, res: Response) {
    try {
        const { token } = req.params;
        if (typeof token !== 'string') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Token inválido' });
        }

        await confirmarCuentaCore(token);

        return res.json({ message: 'Cuenta confirmada exitosamente' });
    } catch (err) {
        console.log(err);
        return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Token de confirmación inválido o expirado' });
    }
}

export async function reenviarConfirmacion(req: Request, res: Response) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'El correo es requerido' });
        }

        const usuario = await User.findOne({ correo: email });

        if (!usuario) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'No existe una cuenta con ese correo' });
        }

        if (usuario.correo_confirmado) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Esta cuenta ya está confirmada' });
        }

        const tokenConfirmacion = generarTokenConfirmacion(usuario._id.toString());
        const urlConfirmacion = `${process.env.APP_URL}/confirmar/${tokenConfirmacion}`;

        await enviarCorreoConfirmacion(usuario.correo, usuario.nombre, urlConfirmacion);

        return res.json({ message: 'Correo de confirmación reenviado' });
    } catch (err) {
        console.log(err);
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}

export async function cambiarRolUsuario(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const { id } = req.params;
        const { rol } = req.body;

        const rolesValidos = ['administrador', 'usuario', 'moderador'];
        if (!rol || !rolesValidos.includes(rol)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Rol inválido' });
        }

        if (id === req.user._id.toString()) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'No puedes cambiar tu propio rol' });
        }

        const usuario = await User.findByIdAndUpdate(id, { rol }, { new: true }).select('-contrasena_hash');

        if (!usuario) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'Usuario no encontrado' });
        }

        return res.json({ message: 'Rol actualizado exitosamente', usuario });
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}

export async function agregarJuegoActivo(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const { juegoId } = req.params;

        if (typeof juegoId !== 'string') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id de juego inválido' });
        }

        const { busca_equipo } = req.body;

        const usuario = await User.findById(req.user._id);
        if (!usuario) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'Usuario no encontrado' });
        }

        usuario.juegos_activos = usuario.juegos_activos || [];

        const existente = usuario.juegos_activos.find((j) => j.juego_id.toString() === juegoId);

        if (existente) {
            existente.busca_equipo = !!busca_equipo;
        } else {
            usuario.juegos_activos.push({
                juego_id: new Types.ObjectId(juegoId),
                busca_equipo: !!busca_equipo,
                desde: new Date(),
            });
        }

        // si estaba en pasados, lo quitamos (lo volvió a jugar)
        usuario.juegos_pasados = (usuario.juegos_pasados || []).filter((id) => id.toString() !== juegoId);

        await usuario.save();

        try {
            const idsJuegos = usuario.juegos_activos.map((j) => j.juego_id.toString());
            await sincronizarJuegosUsuario(req.user._id.toString(), idsJuegos);
        } catch (err) {
            console.error(
                `usuario ${req.user._id} actualizado en mongo pero FALLO la sincronizacion de juegos con dgraph`,
                err,
            );
        }

        return res.json({ message: 'Juego agregado a activos', juegos_activos: usuario.juegos_activos });
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}

export async function quitarJuegoActivo(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const { juegoId } = req.params;

        if (typeof juegoId !== 'string') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id de juego inválido' });
        }

        const usuario = await User.findById(req.user._id);
        if (!usuario) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'Usuario no encontrado' });
        }

        const teniaJuego = (usuario.juegos_activos || []).some((j) => j.juego_id.toString() === juegoId);
        if (!teniaJuego) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'No tienes este juego marcado como activo' });
        }

        usuario.juegos_activos = (usuario.juegos_activos || []).filter((j) => j.juego_id.toString() !== juegoId);

        usuario.juegos_pasados = usuario.juegos_pasados || [];
        if (!usuario.juegos_pasados.some((id) => id.toString() === juegoId)) {
            usuario.juegos_pasados.push(new Types.ObjectId(juegoId));
        }

        await usuario.save();

        try {
            const idsJuegos = usuario.juegos_activos.map((j) => j.juego_id.toString());
            await sincronizarJuegosUsuario(req.user._id.toString(), idsJuegos);
        } catch (err) {
            console.error(
                `usuario ${req.user._id} actualizado en mongo pero FALLO la sincronizacion de juegos con dgraph`,
                err,
            );
        }

        return res.json({ message: 'Juego movido a pasados' });
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}

export async function agregarJuegoPasado(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const { juegoId } = req.params;

        if (typeof juegoId !== 'string') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id de juego inválido' });
        }

        const usuario = await User.findById(req.user._id);
        if (!usuario) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'Usuario no encontrado' });
        }

        // si estaba activo, lo quitamos de ahí primero
        usuario.juegos_activos = (usuario.juegos_activos || []).filter((j) => j.juego_id.toString() !== juegoId);

        usuario.juegos_pasados = usuario.juegos_pasados || [];
        if (!usuario.juegos_pasados.some((id) => id.toString() === juegoId)) {
            usuario.juegos_pasados.push(new Types.ObjectId(juegoId));
        }

        await usuario.save();

        try {
            const idsJuegos = usuario.juegos_activos.map((j) => j.juego_id.toString());
            await sincronizarJuegosUsuario(req.user._id.toString(), idsJuegos);
        } catch (err) {
            console.error(
                `usuario ${req.user._id} actualizado en mongo pero FALLO la sincronizacion de juegos con dgraph`,
                err,
            );
        }

        return res.json({ message: 'Juego agregado a pasados' });
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}

export async function quitarJuegoPasado(req: AuthRequest, res: Response) {
    try {
        if (typeof req.user === 'string' || !req.user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No autenticado' });
        }

        const { juegoId } = req.params;

        if (typeof juegoId !== 'string') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id de juego inválido' });
        }

        const usuario = await User.findById(req.user._id);
        if (!usuario) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'Usuario no encontrado' });
        }

        usuario.juegos_pasados = (usuario.juegos_pasados || []).filter((id) => id.toString() !== juegoId);
        await usuario.save();

        return res.json({ message: 'Juego quitado de pasados' });
    } catch (err) {
        console.log(err);
        if ((err as Error).name === 'CastError') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Id Invalido' });
        }
        return res.status(HttpStatus.SERVER_ERROR).json({ message: 'Error del servidor' });
    }
}
