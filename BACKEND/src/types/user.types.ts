import { Types } from 'mongoose';

//Los enums sirven para evitar errores de tipeo y para tener un conjunto de valores predefinidos

export enum Sexo {
    MASCULINO = 'masculino',
    FEMENINO = 'femenino',
    OTRO = 'otro',
}

export enum ModoDeJuego {
    CASUAL = 'casual',
    COMPETITIVO = 'competitivo',
    AGRESIVO = 'agresivo',
    ESTRATEGICO = 'estrategico',
    COOPERATIVO = 'cooperativo',
    EXPLORADOR = 'explorador',
    APOYO = 'apoyo',
    ROLERO = 'rolero',
    COMPLETISTA = 'completista', //logros/misiones
    TRYHARD = 'tryhard',
}

export enum Idioma {
    ESPANOL = 'español',
    INGLES = 'inglés',
    PORTUGUES = 'portugués',
    FRANCES = 'francés',
    ALEMAN = 'alemán',
    ITALIANO = 'italiano',
    JAPONES = 'japonés',
    COREANO = 'coreano',
    CHINO = 'chino',
    RUSO = 'ruso',
    ARABE = 'árabe',
    HINDI = 'hindi',
}

export enum Plataforma {
    PC = 'pc',
    PLAYSTATION = 'playstation',
    XBOX = 'xbox',
    NINTENDO_SWITCH = 'nintendo_switch',
    MOBILE = 'mobile',
}

export enum Roles {
    ADMIN = 'administrador',
    USER = 'usuario',
    MOD = 'moderador',
}

//Las interfaces definen la estructura de los objetos
//---------------
//Definen la estructura delobkjeto anidado
export interface IJuegoActivo {
    juego_id: Types.ObjectId; // referencia a otro documento
    busca_equipo: boolean;
    desde: Date;
}

export interface IPlataforma {
    nombre: Plataforma;
    gamertag: string;
}
//---------------

export interface IUser {
    nombre: string;
    edad?: number;
    sexo?: Sexo;
    correo: string;
    correo_confirmado?: boolean;
    contrasena_hash: string;
    rol?: Roles;
    isActive?: boolean;
    foto_perfil?: string;
    zona_horaria?: string;
    horario_juego?: string[];
    disponibilidad?: string[];
    idiomas?: Idioma[];
    modo_juego?: ModoDeJuego[];
    plataformas?: IPlataforma[];
    juegos_activos?: IJuegoActivo[]; //Array de objetos anidados
    juegos_pasados?: Types.ObjectId[]; //Array de referencias a otros documetos
}
