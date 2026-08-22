import {mapearPlataformas , mapearGeneros, transformarJuegoRAWG } from './juego.services';
import { Plataforma } from '../types/user.types';

// describe agrupa todas las pruebas de una misma funcion bajo un mismo nombre
// no hace nada por si solo, solo organiza la salida cuando corres los tests
describe('mapearPlataformas', () => {

    // "it" define una prueba individual, con una descripcion de que esperamos que pase
    it('debería traducir "PC" y "PlayStation 5" a los valores del enum correctos', () => {

        // Arrange preparamos los datos de entrada
        // simulamos exactamente la forma que trae RAWG: [{platform: {name: "..."}}]
        const platformsRAWG = [
            { platform: { id: 4, name: 'PC', slug: 'pc' } },
            { platform: { id: 187, name: 'PlayStation 5', slug: 'playstation5' } }
        ];

        // Act: ejecutamos la funcion real con esos datos
        const resultado = mapearPlataformas(platformsRAWG);

        // Assert: verificamos que el resultado sea el esperado
        // toEqual compara el contenido del array, no si es exactamente el mismo objeto en memoria
        expect(resultado).toEqual([Plataforma.PC, Plataforma.PLAYSTATION]);
    });

    it('debería ignorar plataformas que no existen en el diccionario, como "Linux"', () => {

        // Arrange
        const platformsRAWG = [
            { platform: { id: 4, name: 'PC', slug: 'pc' } },
            { platform: { id: 6, name: 'Linux', slug: 'linux' } } // esta no está en plataformaMap
        ];

        // Act
        const resultado = mapearPlataformas(platformsRAWG);

        // Assert
        // "Linux" debería desaparecer, solo queda PC
        expect(resultado).toEqual([Plataforma.PC]);
    });

    it('debería eliminar duplicados cuando dos plataformas de RAWG mapean al mismo valor del enum', () => {

        // Arrange
        // PS4 y PS5 son distintas en RAWG, pero ambas se traducen a Plataforma.PLAYSTATION
        const platformsRAWG = [
            { platform: { id: 18, name: 'PlayStation 4', slug: 'playstation4' } },
            { platform: { id: 187, name: 'PlayStation 5', slug: 'playstation5' } }
        ];

        // Act
        const resultado = mapearPlataformas(platformsRAWG);

        // Assert
        // sin el Set que ya tiene la funcion, aqui saldrian dos entradas repetidas
        expect(resultado).toEqual([Plataforma.PLAYSTATION]);
        expect(resultado.length).toBe(1); // aserción extra, para dejar explícito que no hay duplicados
    });

});


describe('mapearGeneros', () => {

    it('debería extraer solo los nombres de un array de géneros de RAWG', () => {

        //  simulamos la forma real que trae RAWG para "genres"
        // cada genero es un objeto con id, name y slug, pero solo nos interesa "name"
        const genresRAWG = [
            { id: 2, name: 'Shooter', slug: 'shooter' },
            { id: 4, name: 'Action', slug: 'action' }
        ];

        // Act
        const resultado = mapearGeneros(genresRAWG);

        // Assert
        // esperamos un array de strings simples, sin los objetos completos
        expect(resultado).toEqual(['Shooter', 'Action']);
    });

    it('debería regresar un array vacío si no hay géneros', () => {

        // Arrange RAWG a veces trae "genres: []"
        const genresRAWG: { id: number; name: string; slug: string }[] = [];

        // Act
        const resultado = mapearGeneros(genresRAWG);

        // Assert
        expect(resultado).toEqual([]);
    });

    it('debería mantener el orden original de los géneros', () => {

        // Arrange
        // este caso confirma que no reordena nada, solo transforma
        const genresRAWG = [
            { id: 10, name: 'Strategy', slug: 'strategy' },
            { id: 2, name: 'Shooter', slug: 'shooter' },
            { id: 4, name: 'Action', slug: 'action' }
        ];

        // Act
        const resultado = mapearGeneros(genresRAWG);

        // Assert
        expect(resultado).toEqual(['Strategy', 'Shooter', 'Action']);
    });

});


describe('transformarJuegoRAWG', () => {

    it('debería transformar el detalle completo de RAWG a la forma de IJuego', () => {

        // Arrang simulamos un objeto completo como el que regresa RAWG
        // para el endpoint de detalle de un solo juego
        const juegoRAWG = {
            name: 'Valorant',
            background_image: 'https://ejemplo.com/valorant.jpg',
            id: 415171,
            genres: [
                { id: 2, name: 'Shooter', slug: 'shooter' },
                { id: 10, name: 'Strategy', slug: 'strategy' }
            ],
            platforms: [
                { platform: { id: 4, name: 'PC', slug: 'pc' } },
                { platform: { id: 186, name: 'Xbox Series S/X', slug: 'xbox-series-x' } }
            ]
        };

        // Act
        const resultado = transformarJuegoRAWG(juegoRAWG);

        // Assert
        // verificamos que cada campo quedo bien mapeado a la forma de IJuego
        expect(resultado).toEqual({
            titulo: 'Valorant',
            imagen: 'https://ejemplo.com/valorant.jpg',
            generos: ['Shooter', 'Strategy'],
            plataformas: [Plataforma.PC, Plataforma.XBOX],
            id_api: 415171
        });
    });

    it('debería regresar arrays vacíos de generos y plataformas si el juego no trae ninguno', () => {

        // Arrange un juego sin generos ni plataformas registradas en RAWG
        const juegoRAWG = {
            name: 'Juego Sin Datos',
            background_image: '',
            id: 999999,
            genres: [],
            platforms: []
        };

        // Act
        const resultado = transformarJuegoRAWG(juegoRAWG);

        // Assert
        expect(resultado.generos).toEqual([]);
        expect(resultado.plataformas).toEqual([]);
        expect(resultado.titulo).toBe('Juego Sin Datos');
        expect(resultado.id_api).toBe(999999);
    });

});