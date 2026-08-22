export const handlebarsHelpers = {
    colorPlataforma: function (plataforma: string) {
        const colores: Record<string, string> = {
            pc: 'dark',
            playstation: 'primary',
            xbox: 'success',
            nintendo_switch: 'danger',
            mobile: 'warning',
        };
        return colores[plataforma] || 'secondary';
    },
    colorGenero: function (index: number) {
        const colores = ['primary', 'success', 'danger', 'warning', 'info', 'dark'];
        return colores[index % colores.length];
    },

    marcadoSiEnArray: function (valor: string, array: string[] | undefined) {
        if (!array) return '';
        return array.includes(valor) ? 'checked' : '';
    },

    marcadoSiIgual: function (valor: string, otro: string | undefined) {
        return valor === otro ? 'checked' : '';
    },

    eq: function (a: unknown, b: unknown) {
        return String(a) === String(b);
    },

    esModeradorOAdmin: function (rol: string) {
        return rol === 'administrador' || rol === 'moderador';
    },
};
