import { createSocket } from 'node:dgram';

// Estos nombres también se usarán en el dashboard de CloudWatch.
type MetricaApp = 'MatchesCreados' | 'FallosSyncUsuarioDgraph';

const HOST_STATSD = '127.0.0.1';
const PUERTO_STATSD = 8125;

// Envía un incremento al CloudWatch Agent que corre en la misma EC2.
export function incrementarMetrica(nombre: MetricaApp): void {
    const socket = createSocket('udp4');

    // En StatsD, "1|c" significa sumar uno a un contador.
    const mensaje = `${nombre}:1|c`;

    socket.send(mensaje, PUERTO_STATSD, HOST_STATSD, (error) => {
        socket.close();

        // Un fallo de monitoreo no debe interrumpir la operación del usuario.
        if (error) {
            console.warn(`No se pudo enviar la métrica ${nombre}:`, error.message);
        }
    });
}