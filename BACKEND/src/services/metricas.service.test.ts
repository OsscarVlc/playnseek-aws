import { createSocket } from 'node:dgram';
import { incrementarMetrica } from './metricas.service';

// Sustituimos el socket real para no enviar tráfico UDP durante las pruebas.
jest.mock('node:dgram', () => ({
    createSocket: jest.fn(),
}));

const enviar = jest.fn();
const cerrar = jest.fn();

beforeEach(() => {
    jest.resetAllMocks();
    (createSocket as jest.Mock).mockReturnValue({
        send: enviar,
        close: cerrar,
    });
});

describe('incrementarMetrica', () => {
    it.each(['MatchesCreados', 'FallosSyncUsuarioDgraph'] as const)(
        'envía un incremento de %s al agente local',
        (nombre) => {
            // Simulamos que Node terminó de enviar el mensaje sin error.
            enviar.mockImplementation((_mensaje, _puerto, _host, callback) => callback(null));

            incrementarMetrica(nombre);

            expect(enviar).toHaveBeenCalledTimes(1);
            expect(enviar).toHaveBeenCalledWith(
                `${nombre}:1|c`,
                8125,
                '127.0.0.1',
                expect.any(Function),
            );
            expect(cerrar).toHaveBeenCalledTimes(1);
        },
    );

    it('registra el error y cierra el socket si falla el envío', () => {
        const aviso = jest.spyOn(console, 'warn').mockImplementation(() => {});
        enviar.mockImplementation((_mensaje, _puerto, _host, callback) => {
            callback(new Error('Fallo UDP de prueba'));
        });

        try {
            expect(() => incrementarMetrica('MatchesCreados')).not.toThrow();
            expect(cerrar).toHaveBeenCalledTimes(1);
            expect(aviso).toHaveBeenCalledWith(
                expect.stringContaining('MatchesCreados'),
                'Fallo UDP de prueba',
            );
        } finally {
            aviso.mockRestore();
        }
    });
});