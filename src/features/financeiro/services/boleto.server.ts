import "server-only";

import { isEquipe } from "@/core/auth/roles";
import type { SessionUser } from "@/core/auth/session";
import { getAdminDb, getAdminStorage } from "@/core/firebase/admin";
import { COLECOES, type Boleto } from "@/core/modelo";

/**
 * Leitura do boleto do aluno.
 *
 * Mesmo escopo do resto do financeiro: a família vê o dos filhos, a equipe
 * vê o de todos. **O aluno não** — mensalidade é assunto de quem paga, e é
 * a mesma regra que já vale para o extrato.
 */

export function podeVerBoleto(sessao: SessionUser, matricula: string): boolean {
  if (sessao.role === "aluno") return false;
  if (isEquipe(sessao.role)) return true;

  return sessao.alunosVinculados.includes(matricula);
}

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
