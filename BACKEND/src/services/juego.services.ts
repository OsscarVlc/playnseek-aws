import { Plataforma } from '../types/user.types';
import { IRawgPlatform, IRawgGenre, IRawgJuegoDetalle } from '../types/rawg.types';
import { IJuego } from '../types/juego.types';

//Buscar una lista de posibles juegos
export async function buscarJuegoEnRAWG(nombre: string) {
    const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(nombre)}&key=${process.env.RAWG_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error al buscar juego: ${response.status}`);
    }
    const data = await response.json();
    return data;
}

//Obtener un juego especifico
export async function obtenerDetalleJuegoRAWG(id: number) {
    const url = `https://api.rawg.io/api/games/${id}?key=${process.env.RAWG_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error al buscar juego: ${response.status}`);
    }
    const data = await response.json();
    return data;
}

/**
 *
 * encodeURIComponent(nombre)
 * Convierte espacion en %20, acentros y cualquier
 * caracter especal en su forma segura pa URL
 */

const plataformaMap: Record<string, Plataforma> = {
    PC: Plataforma.PC,
    'PlayStation 5': Plataforma.PLAYSTATION,
    'PlayStation 4': Plataforma.PLAYSTATION,
    'PlayStation 3': Plataforma.PLAYSTATION,
    PlayStation: Plataforma.PLAYSTATION,
    'Xbox Series S/X': Plataforma.XBOX,
    'Xbox One': Plataforma.XBOX,
    'Xbox 360': Plataforma.XBOX,
    'Nintendo Switch': Plataforma.NINTENDO_SWITCH,
    iOS: Plataforma.MOBILE,
    Android: Plataforma.MOBILE,
};

/*"platforms": [
                {
                    "platform": {
                        "id": 4,
                        "name": "PC",
                        "slug": "pc"
                    }
                },
                {
                    "platform": {
                        "id": 187,
                        "name": "PlayStation 5",
                        "slug": "playstation5"
                    }
                }, */

export function mapearPlataformas(platformsRAWG: IRawgPlatform[]): Plataforma[] {
    //
    const nombres = platformsRAWG.map((p) => p.platform.name); //extrae solo el nombre desde la estructura anidada
    const traducidas = nombres.map((nombre) => plataformaMap[nombre]);
    const sinDuplicados = [...new Set(traducidas.filter((p) => p !== undefined))]; //descarta las plataformas que no existen en el diccionario
    return sinDuplicados;
}

/**
 * 
 * "genres": [
                {
                    "id": 2,
                    "name": "Shooter",
                    "slug": "shooter"
                },
                {
                    "id": 10,
                    "name": "Strategy",
                    "slug": "strategy"
                },
 */

export function mapearGeneros(genresRAWG: IRawgGenre[]): string[] {
    const generos = genresRAWG.map((g) => g.name);
    return generos;
}

export function transformarJuegoRAWG(juegoRAWG: IRawgJuegoDetalle): IJuego {
    return {
        titulo: juegoRAWG.name,
        imagen: juegoRAWG.background_image,
        generos: mapearGeneros(juegoRAWG.genres),
        plataformas: mapearPlataformas(juegoRAWG.platforms),
        id_api: juegoRAWG.id,
    };
}
