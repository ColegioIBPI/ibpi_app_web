/**
 * Modelo de dados do Portal IBPI.
 *
 * Uma coleção por arquivo, declarada com Zod — os tipos saem por inferência,
 * então validação e tipagem nunca divergem. A documentação em prosa está em
 * `docs/modelo-dados.md`.
 *
 * Coleções com dado migrado do Access: `alunos`, `responsaveis`, `turmas`,
 * `disciplinas`, `salas`, `matriculas`, `cobrancas`, `contratos`.
 *
 * Coleções ainda vazias, modeladas conforme as tabelas e planilhas de
 * origem: `professores`, `alocacoes`, `diasDeAula`, `frequenciaDiaria`,
 * `diarioClasse`, `ocorrencias`, `notas`, `boletins`, `auditoria`.
 */

export * from "@/core/modelo/comum";
export * from "@/core/modelo/aluno";
export * from "@/core/modelo/responsavel";
export * from "@/core/modelo/escola";
export * from "@/core/modelo/frequencia";
export * from "@/core/modelo/nota";
export * from "@/core/modelo/financeiro";
export * from "@/core/modelo/aviso";

/** Nome de cada coleção no Firestore, em um lugar só. */
export const COLECOES = {
  users: "users",
  alunos: "alunos",
  responsaveis: "responsaveis",
  professores: "professores",
  turmas: "turmas",
  disciplinas: "disciplinas",
  salas: "salas",
  alocacoes: "alocacoes",
  diasDeAula: "diasDeAula",
  matriculas: "matriculas",
  frequenciaDiaria: "frequenciaDiaria",
  diarioClasse: "diarioClasse",
  ocorrencias: "ocorrencias",
  notas: "notas",
  boletins: "boletins",
  cobrancas: "cobrancas",
  contratos: "contratos",
  avisos: "avisos",
  auditoria: "auditoria",
} as const;

export type Colecao = (typeof COLECOES)[keyof typeof COLECOES];
