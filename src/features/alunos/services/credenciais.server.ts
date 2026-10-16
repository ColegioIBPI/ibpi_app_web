import "server-only";

import { administraEscola } from "@/core/auth/roles";
import type { SessionUser } from "@/core/auth/session";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type Credenciais } from "@/core/modelo";

/**
 * Leitura dos acessos do aluno.
 *
 * O escopo é aplicado aqui porque o Admin SDK ignora as Security Rules: o
 * responsável lê os dos filhos vinculados, a equipe lê os de todos.
 *
 * Da escola, lê quem administra: secretaria, coordenação e administração.
 * **Professor e financeiro não** — são equipe, mas senha de plataforma não
 * é assunto de quem dá aula nem de quem cuida do caixa.
 *
 * A lista tem de bater com a de `firestore.rules`. Uma verificação contra o
 * banco pegou as duas divergindo — o servidor liberava para o financeiro e
 * a regra negava —, e o resultado seria o Portal mostrando o que o
 * aplicativo não consegue ler.
 */

export function podeVerCredenciais(
  sessao: SessionUser,
  matricula: string,
): boolean {
  return (
    administraEscola(sessao.role) ||
    sessao.alunosVinculados.includes(matricula) ||
    sessao.matricula === matricula
  );
}

/** `null` para quem não tem direito — quem chama responde 404. */
export async function obterCredenciais(
  sessao: SessionUser,
  matricula: string,
): Promise<Credenciais | null> {
  if (!podeVerCredenciais(sessao, matricula)) return null;

  const doc = await getAdminDb()
    .collection(COLECOES.credenciais)
    .doc(matricula)
    .get();

  return doc.exists ? (doc.data() as Credenciais) : null;
}
