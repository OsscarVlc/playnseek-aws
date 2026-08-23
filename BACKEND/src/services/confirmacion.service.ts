import { User } from '../database/mongo/models/user.model';
import { verificarTokenConfirmacion } from '../utils/jwt';

// contiene la logica real de confirmar una cuenta, sin decidir como responder
// tanto la api como las vistas la llaman y cada una responde a su manera
export async function confirmarCuentaCore(token: string) {
    const { id } = verificarTokenConfirmacion(token);

    const usuario = await User.findById(id);
    if (!usuario) {
        throw new Error('Usuario no encontrado');
    }

    usuario.correo_confirmado = true;
    await usuario.save();

    return usuario;
}
