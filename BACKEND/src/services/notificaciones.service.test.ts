import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { User } from '../database/mongo/models/user.model';
import { construirEventoMatch, notificarMatch } from './notificaciones.service';

jest.mock('../database/mongo/models/user.model');
jest.mock('@aws-sdk/client-sns', () => ({
    SNSClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
    PublishCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

const mockSend = jest.fn();

const ID_A = '111111111111111111111111';
const ID_B = '222222222222222222222222';
const CORREO_ANA = 'ana@test.com';
const CORREO_BETO = 'beto@test.com';

// Simula User.find(...).select(...) devolviendo los usuarios indicados
function simularUsuarios(usuarios: { _id: string; nombre: string; correo: string }[]) {
    (User.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(usuarios.map((u) => ({ ...u, _id: { toString: () => u._id } }))),
    });
}

describe('construirEventoMatch', () => {
    it('arma el evento con los dos usuarios del match', async () => {
        simularUsuarios([
            { _id: ID_A, nombre: 'Ana', correo: CORREO_ANA },
            { _id: ID_B, nombre: 'Beto', correo: CORREO_BETO },
        ]);

        const evento = await construirEventoMatch(ID_A, ID_B);

        expect(evento?.tipo).toBe('match_creado');
        expect(evento?.usuarios).toEqual([
            { id: ID_A, nombre: 'Ana', correo: CORREO_ANA },
            { id: ID_B, nombre: 'Beto', correo: CORREO_BETO },
        ]);
    });

    it('devuelve null si alguno de los usuarios no existe', async () => {
        simularUsuarios([{ _id: ID_A, nombre: 'Ana', correo: CORREO_ANA }]);

        expect(await construirEventoMatch(ID_A, ID_B)).toBeNull();
    });
});

describe('notificarMatch', () => {
    const topicOriginal = process.env.SNS_TOPIC_ARN;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:playnseek-matches';
        simularUsuarios([
            { _id: ID_A, nombre: 'Ana', correo: CORREO_ANA },
            { _id: ID_B, nombre: 'Beto', correo: CORREO_BETO },
        ]);
    });

    afterAll(() => {
        process.env.SNS_TOPIC_ARN = topicOriginal;
    });

    it('publica el evento en el topic configurado', async () => {
        mockSend.mockResolvedValue({ MessageId: 'abc' });

        const publicado = await notificarMatch(ID_A, ID_B);

        expect(publicado).toBe(true);
        expect(SNSClient).toHaveBeenCalled();
        const input = (PublishCommand as unknown as jest.Mock).mock.calls[0][0];
        expect(input.TopicArn).toBe(process.env.SNS_TOPIC_ARN);
        expect(JSON.parse(input.Message).usuarios).toHaveLength(2);
    });

    it('no publica nada si falta SNS_TOPIC_ARN', async () => {
        delete process.env.SNS_TOPIC_ARN;

        const publicado = await notificarMatch(ID_A, ID_B);

        expect(publicado).toBe(false);
        expect(mockSend).not.toHaveBeenCalled();
    });

    it('no lanza error si SNS falla', async () => {
        mockSend.mockRejectedValue(new Error('SNS no disponible'));
        const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        await expect(notificarMatch(ID_A, ID_B)).resolves.toBe(false);

        errorLog.mockRestore();
    });
});
