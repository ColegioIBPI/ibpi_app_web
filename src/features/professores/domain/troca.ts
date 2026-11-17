import type { Alocacao } from "@/core/modelo";

/**
 * Trocar o professor de uma disciplina no meio do ano.
 *
 * Era feito à mão, em dois passos: vincular o novo e desvincular o antigo.
 * Funcionava, e a ordem importava — ao contrário, a disciplina saía da
 * grade e sumia do boletim até o vínculo novo entrar. Documentar a ordem
 * certa resolve menos que não exigir ordem nenhuma.
 *
 * O que **não** muda, e é a pergunta que a escola fez: nota, chamada do
 * dia e ocorrência continuam, porque são identificadas pela turma e pela
 * disciplina, não por quem lançou. O diário do anterior fica em leitura no
 * diário do novo — ver `features/diario/domain/anterior.ts`.
 */

export interface ProfessorParaTroca {
  nome: string;
  ativo?: boolean;
}

/**
 * O motivo para recusar a troca, ou `null` quando ela pode acontecer.
 *
 * Devolve texto, e não um código, porque toda recusa aqui é lida por uma
 * pessoa na tela — não há nada a decidir a partir dela.
 */
export function impedimentoParaTrocar(
  atual: Pick<
    Alocacao,
    "professorId" | "ativa" | "turmaCodigo" | "disciplinaNome"
  >,
  novoProfessorId: string,
  novoProfessor: ProfessorParaTroca | null,
): string | null {
  const disciplina = atual.disciplinaNome ?? "esta disciplina";

  // Vínculo já removido não se troca: o certo é vincular alguém, e é
  // outro botão. Trocar aqui reativaria em silêncio o que a secretaria
  // tinha decidido tirar.
  if (atual.ativa === false) {
    return "Este vínculo já foi removido. Use Vincular para colocar um professor.";
  }

  if (!novoProfessor) return "Professor não encontrado.";

  if (novoProfessor.ativo === false) {
    return `${novoProfessor.nome} está inativo no cadastro. Reative o professor antes de passar a turma para ele.`;
  }

  if (novoProfessorId === atual.professorId) {
    return `${novoProfessor.nome} já leciona ${disciplina} nesta turma.`;
  }

  return null;
}
