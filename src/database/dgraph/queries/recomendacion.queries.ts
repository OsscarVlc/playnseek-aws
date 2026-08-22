import { dgraphClient } from '../../../config/dgraph.config';

export interface CandidatoRecomendado {
    mongo_id: string;
    nombre: string;
}

// Buscamos candidatos de match para un usuario, en Dgraph, respetando
// la jerarquía de prioridad:
// 1. Idioma en común,
// 2. Plataforma en común,
// 3. Juegos en común. Excluye al propio usuario y a quienes ya son match.

export async function obtenerRecomendacionesDgraph(
    mongoId: string,
    limite: number = 20,
): Promise<CandidatoRecomendado[]> {
    const txn = dgraphClient.newTxn();

    try {
        const query = `
      query recomendaciones($mongoId: string) {
        target as var(func: eq(mongo_id, $mongoId)) {
          idiomasT as habla
          plataformasT as juega_en
          juegosT as usuario_juega
          misMatches as usuario_conecta
        }

        var(func: uid(misMatches)) {
          conectados as ~usuario_conecta
        }

        porIdioma(func: type(Usuario)) @filter(uid_in(habla, uid(idiomasT)) AND NOT uid(target) AND NOT uid(conectados)) {
          mongo_id
          nombre
        }

        porPlataforma(func: type(Usuario)) @filter(uid_in(juega_en, uid(plataformasT)) AND NOT uid(target) AND NOT uid(conectados)) {
          mongo_id
          nombre
        }

        porJuego(func: type(Usuario)) @filter(uid_in(usuario_juega, uid(juegosT)) AND NOT uid(target) AND NOT uid(conectados)) {
          mongo_id
          nombre
        }
      }
    `;

        const res = await txn.queryWithVars(query, { $mongoId: mongoId });
        const data = res.getJson();

        // Combinamos los 3 niveles respetando el orden de prioridad,
        // sin repetir el mismo usuario si aparece en más de un nivel
        const vistos = new Set<string>();
        const resultado: CandidatoRecomendado[] = [];

        const niveles = [data.porIdioma || [], data.porPlataforma || [], data.porJuego || []];

        for (const nivel of niveles) {
            for (const candidato of nivel) {
                if (resultado.length >= limite) break;
                if (!vistos.has(candidato.mongo_id)) {
                    vistos.add(candidato.mongo_id);
                    resultado.push({ mongo_id: candidato.mongo_id, nombre: candidato.nombre });
                }
            }
            if (resultado.length >= limite) break;
        }

        return resultado;
    } catch (err) {
        console.error(`Error obteniendo recomendaciones de Dgraph para ${mongoId}:`, err);
        throw err;
    } finally {
        await txn.discard();
    }
}
