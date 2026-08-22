import { handlebarsHelpers } from './handlebars-helpers';

describe('colorPlataforma', () => {
    it('debería regresar "success" para xbox', () => {
        // Arrange
        const plataforma = 'xbox';

        // Act
        const resultado = handlebarsHelpers.colorPlataforma(plataforma);

        // Assert
        expect(resultado).toBe('success');
    });

    it('debería regresar "secondary" para una plataforma que no está en el diccionario', () => {
        // Arrange
        // simulamos una plataforma inventada, que nunca vamos a tener en el enum real
        const plataforma = 'plataforma-inexistente';

        // Act
        const resultado = handlebarsHelpers.colorPlataforma(plataforma);

        // Assert
        // esta es la razon de ser del "|| 'secondary'" dentro del helper original
        expect(resultado).toBe('secondary');
    });
});

describe('colorGenero', () => {
    it('debería regresar el mismo color para índices que se repiten cada 6 posiciones', () => {
        // Arrange
        // la lista de colores tiene 6 elementos, asi que el indice 0 y el 6
        // deberian regresar el mismo color
        const indiceUno = 0;
        const indiceDos = 6;

        // Act
        const colorUno = handlebarsHelpers.colorGenero(indiceUno);
        const colorDos = handlebarsHelpers.colorGenero(indiceDos);

        // Assert
        expect(colorUno).toBe(colorDos);
    });
});

describe('eq', () => {
    it('deberia regresar true al comparar dos strings iguales', () => {
        // Arrange
        const valorA = 'admin123';
        const valorB = 'admin123';

        const resultado = handlebarsHelpers.eq(valorA, valorB);

        expect(resultado).toBe(true);
    });

    it('deberia regresar true al comparar un ObjectId con su representación en string', () => {
        // simulamos un ObjectId de mongoose
        const objectIdSimulado = { toString: () => 'abc123' };
        const stringPlano = 'abc123';

        const resultado = handlebarsHelpers.eq(objectIdSimulado, stringPlano);

        // esto es justo el caso real de uso: comparar this._id (ObjectId) contra
        // miUsuarioId (string) en las vistas de Handlebars
        expect(resultado).toBe(true);
    });

    it('deberia regresar false si los valores son distintos', () => {
        // Arrange
        const valorA = 'admin123';
        const valorB = 'usuario456';

        // Act
        const resultado = handlebarsHelpers.eq(valorA, valorB);

        // Assert
        expect(resultado).toBe(false);
    });
});

describe('esModeradorOAdmin', () => {
    it('deberia regresar true para el rol "administrador"', () => {
        expect(handlebarsHelpers.esModeradorOAdmin('administrador')).toBe(true);
    });

    it('deberia regresar true para el rol "moderador"', () => {
        expect(handlebarsHelpers.esModeradorOAdmin('moderador')).toBe(true);
    });

    it('deberia regresar false para el rol "usuario"', () => {
        expect(handlebarsHelpers.esModeradorOAdmin('usuario')).toBe(false);
    });
});
