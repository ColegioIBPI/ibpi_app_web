import { chaveDeComparacao } from "@/features/migracao/domain/texto";
import type { Totais } from "@/features/financeiro/domain/cobranca";

/**
 * Filtro da lista financeira da escola.
 *
 * Separado da página porque é a regra que decide quem aparece no relatório
 * de inadimplência — e relatório de cobrança errado gera ligação para a
 * família errada.
 */

export type RecorteFinanceiro = "vencidas" | "em-aberto" | "todos";

export interface LinhaFinanceira {
  matricula: string;
  nome: string;
  turmaCodigo: string | null;
  totais: Totais;
}

export interface FiltroFinanceiro {
  termo?: string;
  turma?: string;
  recorte?: RecorteFinanceiro;
}

export function filtrarLinhas<T extends LinhaFinanceira>(
  linhas: readonly T[],
  filtro: FiltroFinanceiro = {},
): T[] {
  const termo = chaveDeComparacao(filtro.termo ?? "");
  // O padrão é a inadimplência: é a pergunta que traz alguém a esta tela.
  const recorte = filtro.recorte ?? "vencidas";

  return linhas.filter((linha) => {
    if (recorte === "vencidas" && linha.totais.vencido <= 0) return false;
    if (recorte === "em-aberto" && linha.totais.emAberto <= 0) return false;

    if (filtro.turma && linha.turmaCodigo !== filtro.turma) return false;

    if (termo) {
      // A matrícula é comparada crua: ela é número, e a normalização de
      // nome não ajuda nem atrapalha aqui.
      return (
        chaveDeComparacao(linha.nome).includes(termo) ||
        linha.matricula.includes(filtro.termo?.trim() ?? "")
      );
    }

    return true;
  });
}

export interface ResumoFinanceiro {
  alunos: number;
  inadimplentes: number;
  vencido: number;
  emAberto: number;
}

/** Números do topo da tela, sempre sobre a escola inteira. */
export function resumir(linhas: readonly LinhaFinanceira[]): ResumoFinanceiro {
  let vencido = 0;
  let emAberto = 0;
  let inadimplentes = 0;

  for (const linha of linhas) {
    vencido += linha.totais.vencido;
    emAberto += linha.totais.emAberto;
    if (linha.totais.vencido > 0) inadimplentes += 1;
  }

  return {
    alunos: linhas.length,
    inadimplentes,
    vencido: Math.round(vencido * 100) / 100,
    emAberto: Math.round(emAberto * 100) / 100,
  };
}

export function recorteDaQuery(valor: unknown): RecorteFinanceiro {
  return valor === "todos" || valor === "em-aberto" ? valor : "vencidas";
}
