import "server-only";

import { COLECOES } from "@/core/modelo";
import { getAdminDb } from "@/core/firebase/admin";
import type { OpcaoDeDestino } from "@/core/ui/seletor-de-destino";

/**
 * As opções de "para quem" que alimentam os seletores de destino.
 *
 * Avisos e informações úteis escolhem entre a mesma comunidade escolar, e
 * carregá-la em um lugar só garante que as duas telas ofereçam as mesmas
 * pessoas — com a mesma ordenação, que é o que a secretaria espera ao
 * procurar um nome na lista.
 */

export interface OpcoesDeDestino {
  turmas: OpcaoDeDestino[];
  alunos: OpcaoDeDestino[];
  responsaveis: OpcaoDeDestino[];
}

/**
 * Carrega turmas, alunos ativos e responsáveis.
 *
 * `turmasPermitidas` restringe a lista às turmas do professor: a ação
 * recusaria outra turma, e oferecer na tela o que vai ser recusado é uma
 * armadilha. `null` significa "sem restrição".
 */
export async function opcoesDeDestino(
  turmasPermitidas: string[] | null = null,
): Promise<OpcoesDeDestino> {
  const db = getAdminDb();

  const [turmasDocs, alunosDocs, responsaveisDocs] = await Promise.all([
    db.collection(COLECOES.turmas).get(),
    db.collection(COLECOES.alunos).where("ativo", "==", true).get(),
    db.collection(COLECOES.responsaveis).get(),
  ]);

  const turmas = turmasDocs.docs
    .filter((doc) => !turmasPermitidas || turmasPermitidas.includes(doc.id))
    .map((doc) => ({ valor: doc.id, rotulo: doc.data().codigo as string }));

  const alunos = alunosDocs.docs
    .filter(
      (doc) =>
        !turmasPermitidas ||
        turmasPermitidas.includes(doc.data().turmaId as string),
    )
    .map((doc) => ({
      valor: doc.data().matricula as string,
      rotulo: doc.data().nome as string,
    }));

  const responsaveis = responsaveisDocs.docs.map((doc) => ({
    valor: doc.id,
    rotulo: doc.data().nome as string,
  }));

  return {
    turmas: ordenar(turmas),
    alunos: ordenar(alunos),
    responsaveis: ordenar(responsaveis),
  };
}

/** As turmas do professor; `null` para quem enxerga a escola inteira. */
export async function turmasDaConta(
  uid: string,
  role: string,
): Promise<string[] | null> {
  if (role !== "professor") return null;

  const doc = await getAdminDb().collection(COLECOES.users).doc(uid).get();

  return (doc.data()?.turmas as string[]) ?? [];
}

function ordenar(opcoes: OpcaoDeDestino[]): OpcaoDeDestino[] {
  return opcoes.sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}
