"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chatPrivado_socket_1 = require("./chatPrivado.socket");
describe('nombreSalaPrivada', () => {
    it('debería generar el mismo nombre de sala sin importar el orden de los ids', () => {
        // Arrange
        const idOscar = 'abc123';
        const idAna = 'xyz789';
        // Act
        // probamos las dos combinaciones posibles: Oscar primero, o Ana primero
        const salaUno = (0, chatPrivado_socket_1.nombreSalaPrivada)(idOscar, idAna);
        const salaDos = (0, chatPrivado_socket_1.nombreSalaPrivada)(idAna, idOscar);
        // Assert
        // el resultado debe ser identico en ambos casos, sin importar quien
        // se conecto primero al chat
        expect(salaUno).toBe(salaDos);
    });
    it('deberia tener el prefijo "privado_" y ambos ids ordenados alfabeticamente', () => {
        // Arrange
        const idA = 'zzz';
        const idB = 'aaa';
        // Act
        const resultado = (0, chatPrivado_socket_1.nombreSalaPrivada)(idA, idB);
        // Assert
        // aunque le pasamos zzz primero el resultado debe tener aaa primero
        // porque la funcion los ordena antes de juntarlos
        expect(resultado).toBe('privado_aaa_zzz');
    });
});
