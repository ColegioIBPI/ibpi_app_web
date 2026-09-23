import type { Alocacao } from "@/core/modelo";
import { chaveDeComparacao } from "@/features/migracao/domain/texto";

/**
 * Regras de alocação: professor × turma × disciplina × ano letivo.
 *
 * A alocação é o registro que **define o escopo de acesso do professor** —
 * ele só enxerga alunos, frequência e notas das turmas em que está alocado.
 * Por isso a derivação das turmas mora aqui, pura e testada: um erro nesta
 * conta abre ou fecha o acesso de alguém à vida escolar de menores.
 */

export interface AlocacaoResumida {
  turmaId: string;
  disciplinaId: string;
  ativa?: boolean;
}

/**
 * Id determinístico.
 *
 * Alocar duas vezes a mesma combinação sobrescreve em vez de duplicar — e
 * duplicata aqui apareceria como a mesma disciplina repetida no diário de
 * classe do professor.
 */
export function idDaAlocacao(
  anoLetivo: number,
  professorId: string,
  turmaId: string,
  disciplinaId: string,
): string {
  return `${anoLetivo}-${professorId}-${turmaId}-${disciplinaId}`;
}

/**
 * Turmas distintas em que o professor leciona.
 *
 * Alocação inativa não conta: tirar o professor da turma precisa tirar o
 * acesso dele junto, senão o escopo continua valendo depois de a pessoa
 * deixar de dar aula ali.
 */
export function turmasDasAlocacoes(
  alocacoes: readonly AlocacaoResumida[],
): string[] {
  const turmas = new Set<string>();

  for (const alocacao of alocacoes) {
    if (alocacao.ativa === false) continue;
    turmas.add(alocacao.turmaId);
  }

  return [...turmas].sort();
}

/** Disciplinas do professor numa turma — usado no diário de classe. */
export function disciplinasNaTurma(
  alocacoes: readonly AlocacaoResumida[],
  turmaId: string,
): string[] {
  return [
    ...new Set(
      alocacoes
        .filter((a) => a.ativa !== false && a.turmaId === turmaId)
        .map((a) => a.disciplinaId),
    ),
  ].sort();
}

export interface Conflito {
  ok: boolean;
  erro?: string;
}

/**
 * A alocação já existe?
 *
 * Repetir a mesma combinação não é erro grave — o id determinístico
 * resolveria sobrescrevendo — mas avisar é melhor que aceitar em silêncio
 * uma ação que a pessoa achou que tinha feito duas coisas diferentes.
 */
export function verificarDuplicata(
  existentes: readonly Alocacao[],
  nova: { turmaId: string; disciplinaId: string; anoLetivo: number },
): Conflito {
  const repetida = existentes.find(
    (a) =>
      a.ativa !== false &&
      a.anoLetivo === nova.anoLetivo &&
      a.turmaId === nova.turmaId &&
      a.disciplinaId === nova.disciplinaId,
  );

  if (!repetida) return { ok: true };

  return {
    ok: false,
    erro: `Este professor já leciona ${repetida.disciplinaNome ?? "essa disciplina"} na turma ${repetida.turmaCodigo ?? nova.turmaId}.`,
  };
}

/** Chave de busca do professor, no mesmo formato usado para alunos. */
export function chaveDeBusca(nome: string): string {
  return chaveDeComparacao(nome);
}

export interface ProfessorDaListagem {
  nome: string;
  email?: string | null;
  uid?: string | null;
  turmas: string[];
  ativo: boolean;
}

export interface FiltroDeProfessores {
  termo?: string;
  situacao?: "ativos" | "inativos" | "todos";
  /** `true` mostra só quem ainda não tem conta de acesso. */
  semAcesso?: boolean;
}

export function filtrarProfessores<T extends ProfessorDaListagem>(
  professores: readonly T[],
  filtro: FiltroDeProfessores = {},
): T[] {
  const termo = chaveDeComparacao(filtro.termo ?? "");
  const situacao = filtro.situacao ?? "ativos";

  return professores.filter((professor) => {
    if (situacao === "ativos" && !professor.ativo) return false;
    if (situacao === "inativos" && professor.ativo) return false;
    if (filtro.semAcesso && professor.uid) return false;

    if (!termo) return true;

    return (
      chaveDeComparacao(professor.nome).includes(termo) ||
      chaveDeComparacao(professor.email ?? "").includes(termo)
    );
  });
}

/**
 * O professor pode receber conta de acesso?
 *
 * Exige e-mail (é o login). Diferente do responsável, **não** exige
 * alocação: o professor precisa entrar para ver o próprio cadastro e a
 * coordenação costuma criar o acesso antes de fechar a grade do ano.
 */
export function motivoParaNaoCriarAcesso(
  professor: ProfessorDaListagem,
): string | null {
  if (professor.uid) return "Este professor já tem acesso.";
  if (!professor.email) {
    return "Cadastre um e-mail: é com ele que o professor entra no Portal.";
  }
  if (!professor.ativo) {
    return "Reative o professor antes de criar o acesso.";
  }
  return null;
}
