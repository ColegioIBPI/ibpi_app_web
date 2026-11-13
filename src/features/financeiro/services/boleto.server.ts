import "server-only";

import type { SessionUser } from "@/core/auth/session";
import { getAdminDb, getAdminStorage } from "@/core/firebase/admin";
import { COLECOES, type Boleto } from "@/core/modelo";
import { podeVerBoleto } from "@/features/financeiro/domain/boleto";

/**
 * Leitura do boleto do aluno.
 *
 * Quem pode ver é decidido em `domain/boleto.ts` — regra pura, testada
 * sem subir nada.
 */

/** `null` para quem não tem direito — quem chama responde 404. */
export async function obterBoleto(
  sessao: SessionUser,
  matricula: string,
): Promise<Boleto | null> {
  if (!podeVerBoleto(sessao, matricula)) return null;

  const doc = await getAdminDb()
    .collection(COLECOES.boletos)
    .doc(matricula)
    .get();

  return doc.exists ? (doc.data() as Boleto) : null;
}

export async function lerArquivoDoBoleto(path: string): Promise<Buffer | null> {
  const arquivo = getAdminStorage().bucket().file(path);

  const [existe] = await arquivo.exists();
  if (!existe) return null;

  const [conteudo] = await arquivo.download();
  return conteudo;
}
