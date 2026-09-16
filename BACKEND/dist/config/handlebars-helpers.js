"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlebarsHelpers = void 0;
exports.handlebarsHelpers = {
    colorPlataforma: function (plataforma) {
        const colores = {
            pc: 'dark',
            playstation: 'primary',
            xbox: 'success',
            nintendo_switch: 'danger',
            mobile: 'warning'
        };
        return colores[plataforma] || 'secondary';
    },
    colorGenero: function (index) {
        const colores = ['primary', 'success', 'danger', 'warning', 'info', 'dark'];
        return colores[index % colores.length];
    },
    marcadoSiEnArray: function (valor, array) {
        if (!array)
            return '';
        return array.includes(valor) ? 'checked' : '';
    },
    marcadoSiIgual: function (valor, otro) {
        return valor === otro ? 'checked' : '';
    },
    eq: function (a, b) {
        return String(a) === String(b);
    },
    esModeradorOAdmin: function (rol) {
        return rol === 'administrador' || rol === 'moderador';
    },
};
