import "server-only";

import {
  COLECOES,
  type Alocacao,
  type DiarioDeClasse,
  type Trimestre,
} from "@/core/modelo";
import type { SessionUser } from "@/core/auth/session";
import { obterAlocacao } from "@/core/escola/alocacoes.server";
import { getAdminDb } from "@/core/firebase/admin";
import { idDoDiario } from "@/core/escola/aulas";

/**
 * Leitura do diário de classe.
 *
 * O escopo vem de `core/escola/alocacoes.server`: o professor só alcança as
 * alocações dele, e a verificação é feita aqui porque o Admin SDK ignora as
 * Security Rules. Secretaria e coordenação leem todos, porque conferem o
 * diário.
 */

export interface DiarioComId extends DiarioDeClasse {
  id: string;
}

/**
 * O diário daquela alocação e trimestre, se a pessoa puder abri-lo.
 *
 * Devolve `null` quando o professor tenta um diário que não é dele — e não
 * um erro diferente, pelo mesmo motivo de sempre: dizer "existe, mas não é
 * seu" já entrega informação.
 */
export async function obterDiario(
  sessao: SessionUser,
  alocacaoId: string,
  trimestre: Trimestre,
): Promise<{ diario: DiarioComId | null; alocacao: Alocacao } | null> {
  const alocacao = await obterAlocacao(sessao, alocacaoId);
  if (!alocacao) return null;

  const doc = await getAdminDb()
    .collection(COLECOES.diarioClasse)
    .doc(idDoDiario(alocacaoId, trimestre))
    .get();

  return {
    alocacao,
    diario: doc.exists
      ? { id: doc.id, ...(doc.data() as DiarioDeClasse) }
      : null,
  };
}
