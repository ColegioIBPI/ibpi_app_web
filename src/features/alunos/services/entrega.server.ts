import "server-only";

import { administraEscola } from "@/core/auth/roles";
import type { SessionUser } from "@/core/auth/session";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type EntregaDeDocumentos } from "@/core/modelo";

/**
 * Leitura da conferência de documentos.
 *
 * Visão da secretaria, da coordenação e da administração. **Professor e
 * financeiro não** — conferência de matrícula não é assunto de quem dá
 * aula nem de quem cuida do caixa, e "laudo médico entregue" é informação
 * de saúde que não precisa circular.
 *
 * É coleção separada de `alunos` pela mesma razão das credenciais: a
 * Security Rule decide por documento e nunca por campo.
 */
export async function obterEntrega(
  sessao: SessionUser,
  matricula: string,
): Promise<EntregaDeDocumentos | null> {
  if (!administraEscola(sessao.role)) return null;

  const doc = await getAdminDb()
    .collection(COLECOES.entregaDeDocumentos)
    .doc(matricula)
    .get();

  return doc.exists ? (doc.data() as EntregaDeDocumentos) : null;
}
