import { Plataforma } from './user.types';

export interface IJuego {
    titulo: string;
    imagen?: string;
    generos: string[];
    plataformas: Plataforma[];
    id_api: number;
    activo?: boolean;
}
