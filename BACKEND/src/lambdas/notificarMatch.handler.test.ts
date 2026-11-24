import { enviarCorreoMatch } from '../services/email.service';
import { handler, validarEventoMatch } from './notificarMatch.handler';

jest.mock('../services/email.service');

const eventoValido = {
    tipo: 'match_creado',
    fecha: '2026-11-24T22:00:00.000Z',
    usuarios: [
        { id: 'a1', nombre: 'Ana', correo: 'ana@test.com' },
        { id: 'b2', nombre: 'Beto', correo: 'beto@test.com' },
    ],
};

// Construye el evento tal como SNS lo entrega a la Lambda
function eventoSns(mensaje: unknown) {
    return { Records: [{ Sns: { Message: typeof mensaje === 'string' ? mensaje : JSON.stringify(mensaje) } }] };
}

describe('validarEventoMatch', () => {
    it('acepta un evento de match válido', () => {
        expect(validarEventoMatch(JSON.stringify(eventoValido)).usuarios).toHaveLength(2);
    });

    it('rechaza un mensaje que no es JSON', () => {
        expect(() => validarEventoMatch('no es json')).toThrow('no es JSON');
    });

    it('rechaza un tipo de evento distinto', () => {
        expect(() => validarEventoMatch(JSON.stringify({ ...eventoValido, tipo: 'otro' }))).toThrow('no soportado');
    });

    it('rechaza si un usuario no tiene correo válido', () => {
        const malo = {
            ...eventoValido,
            usuarios: [eventoValido.usuarios[0], { id: 'b2', nombre: 'Beto', correo: 'x' }],
        };
        expect(() => validarEventoMatch(JSON.stringify(malo))).toThrow('dos usuarios');
    });
});

describe('handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.APP_URL = 'http://playnseek.test';
        (enviarCorreoMatch as jest.Mock).mockResolvedValue(undefined);
    });

    it('manda un correo a cada usuario con el nombre de su compañero', async () => {
        const resultado = await handler(eventoSns(eventoValido));

        expect(resultado).toEqual({ registros: 1, correosEnviados: 2 });
        expect(enviarCorreoMatch).toHaveBeenCalledWith('ana@test.com', 'Ana', 'Beto', 'http://playnseek.test/match');
        expect(enviarCorreoMatch).toHaveBeenCalledWith('beto@test.com', 'Beto', 'Ana', 'http://playnseek.test/match');
    });

    it('propaga el error si falla el envío para que SNS reintente', async () => {
        (enviarCorreoMatch as jest.Mock).mockRejectedValue(new Error('SMTP caído'));

        await expect(handler(eventoSns(eventoValido))).rejects.toThrow('SMTP caído');
    });

    it('no hace nada si el evento no trae registros', async () => {
        expect(await handler({})).toEqual({ registros: 0, correosEnviados: 0 });
        expect(enviarCorreoMatch).not.toHaveBeenCalled();
    });
});
