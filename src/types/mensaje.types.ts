import { Types } from 'mongoose';

// mensaje.types.ts
export interface IMensaje {
    usuario_id: Types.ObjectId;
    contenido: string;
    fecha: Date;
    grupo_id?: Types.ObjectId; // presente si es mensaje de grupo
    destinatario_id?: Types.ObjectId; // presente si es mensaje privado
}
//Omit<IMensaje, 'usuario_id'> significa que estamos tomando la interfaz IMensaje y omitiendo la propiedad usuario_id
//  util para este caso ya que   queremos crear una nueva interfaz que sea simila
//  a IMensaje pero con una estructura diferente para la propiedad usuario_id.
export interface IMensajeConUsuario extends Omit<IMensaje, 'usuario_id'> {
    _id: Types.ObjectId;
    usuario_id: {
        _id: Types.ObjectId;
        nombre: string;
    };
}
