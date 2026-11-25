import { urlFotoPerfil } from './fotoPerfil';

describe('urlFotoPerfil', () => {
    it('debería convertir una key de S3 en una ruta /media', () => {
        expect(urlFotoPerfil('perfiles/64b7f0c2a1b2c3d4e5f60718/foto.jpg')).toBe(
            '/media/perfiles/64b7f0c2a1b2c3d4e5f60718/foto.jpg',
        );
    });

    it('debería dejar igual una URL antigua de Cloudinary', () => {
        const url = 'https://res.cloudinary.com/demo/image/upload/foto.jpg';
        expect(urlFotoPerfil(url)).toBe(url);
    });

    it('no debería agregar /media dos veces', () => {
        expect(urlFotoPerfil('/media/perfiles/a.jpg')).toBe('/media/perfiles/a.jpg');
    });

    it('debería regresar undefined si el usuario no tiene foto', () => {
        expect(urlFotoPerfil(undefined)).toBeUndefined();
        expect(urlFotoPerfil('')).toBeUndefined();
    });
});
