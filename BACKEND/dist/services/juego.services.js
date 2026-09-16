"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buscarJuegoEnRAWG = buscarJuegoEnRAWG;
exports.obtenerDetalleJuegoRAWG = obtenerDetalleJuegoRAWG;
exports.transformarJuegoRAWG = transformarJuegoRAWG;
const user_types_1 = require("../types/user.types");
//Buscar una lista de posibles juegos
async function buscarJuegoEnRAWG(nombre) {
    const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(nombre)}&key=${process.env.RAWG_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error al buscar juego: ${response.status}`);
    }
    const data = await response.json();
    return data;
}
//Obtener un juego especifico
async function obtenerDetalleJuegoRAWG(id) {
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
const plataformaMap = {
    PC: user_types_1.Plataforma.PC,
    'PlayStation 5': user_types_1.Plataforma.PLAYSTATION,
    'PlayStation 4': user_types_1.Plataforma.PLAYSTATION,
    'PlayStation 3': user_types_1.Plataforma.PLAYSTATION,
    PlayStation: user_types_1.Plataforma.PLAYSTATION,
    'Xbox Series S/X': user_types_1.Plataforma.XBOX,
    'Xbox One': user_types_1.Plataforma.XBOX,
    'Xbox 360': user_types_1.Plataforma.XBOX,
    'Nintendo Switch': user_types_1.Plataforma.NINTENDO_SWITCH,
    iOS: user_types_1.Plataforma.MOBILE,
    Android: user_types_1.Plataforma.MOBILE,
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
function mapearPlataformas(platformsRAWG) {
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
function mapearGeneros(genresRAWG) {
    const generos = genresRAWG.map((g) => g.name);
    return generos;
}
function transformarJuegoRAWG(juegoRAWG) {
    return {
        titulo: juegoRAWG.name,
        imagen: juegoRAWG.background_image,
        generos: mapearGeneros(juegoRAWG.genres),
        plataformas: mapearPlataformas(juegoRAWG.platforms),
        id_api: juegoRAWG.id,
    };
}
