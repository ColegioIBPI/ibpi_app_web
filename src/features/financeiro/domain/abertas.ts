import { formatarTelefone } from "@/core/lib/format";
import {
  ROTULOS_DE_TIPO_DE_COBRANCA,
  ROTULOS_DE_TIPO_DE_RESPONSAVEL,
  type Cobranca,
  type Responsavel,
  type TipoDeResponsavel,
} from "@/core/modelo";
import {
  diasDeAtraso,
  saldo,
  situacaoDaCobranca,
} from "@/features/financeiro/domain/cobranca";

/**
 * As parcelas em aberto, **uma a uma**.
 *
 * Os relatórios financeiros somavam o aluno inteiro numa linha: "Fulano
 * deve R$ 5.769". Quem vai cobrar precisa do contrário — qual parcela, de
 * que mês, vencida há quanto tempo. Um total não diz se são três
 * mensalidades atrasadas ou a taxa de material de março, e a conversa com a
 * família é sobre a parcela, não sobre o saldo.
 */

export interface ParcelaAberta {
  id: string;
  matricula: string;
  nome: string;
  turmaCodigo: string | null;
  vencimento: string;
  /** `Mensalidade`, `Taxa de material`… `—` nas migradas sem tipo. */
  descricao: string;
  /** `5/12`, ou vazio quando a cobrança não é de carnê. */
  parcela: string;
  valor: number;
  valorPago: number;
  /** O que falta: cobre o pagamento parcial, que o valor não mostra. */
  saldo: number;
  diasDeAtraso: number;
  vencida: boolean;
}

export interface CobrancaComId extends Cobranca {
  id: string;
}

export interface AlunoDaCobranca {
  matricula: string;
  nome: string;
  turmaCodigo: string | null;
}

/**
 * Transforma cobranças em linhas de relatório.
 *
 * Fica de fora o que já foi pago: relatório de cobrança com parcela quitada
 * no meio é relatório que alguém usa para cobrar quem já pagou.
 */
export function parcelasAbertas(
  cobrancas: CobrancaComId[],
  alunos: Map<string, AlunoDaCobranca>,
  hoje: Date = new Date(),
): ParcelaAberta[] {
  return cobrancas
    .filter((cobranca) => !cobranca.dataPagamento)
    .map((cobranca) => {
      const aluno = alunos.get(cobranca.matricula);
      const situacao = situacaoDaCobranca(cobranca, hoje);

      return {
        id: cobranca.id,
        matricula: cobranca.matricula,
        nome: aluno?.nome ?? cobranca.matricula,
        turmaCodigo: aluno?.turmaCodigo ?? null,
        vencimento: cobranca.vencimento,
        descricao: cobranca.tipo
          ? ROTULOS_DE_TIPO_DE_COBRANCA[cobranca.tipo]
          : "—",
        parcela:
          cobranca.parcela && cobranca.totalDeParcelas
            ? `${cobranca.parcela}/${cobranca.totalDeParcelas}`
            : "",
        valor: cobranca.valor ?? 0,
        valorPago: cobranca.valorPago ?? 0,
        saldo: saldo(cobranca),
        diasDeAtraso: diasDeAtraso(cobranca, hoje),
        vencida: situacao === "vencida",
      };
    })
    .sort(
      (a, b) =>
        a.vencimento.localeCompare(b.vencimento) ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    );
}

/** Só as que já passaram do vencimento — o relatório de inadimplência. */
export function somenteVencidas<T extends Pick<ParcelaAberta, "vencida">>(
  parcelas: T[],
): T[] {
  return parcelas.filter((parcela) => parcela.vencida);
}

/**
 * As que vencem **até** a data informada — o relatório de valores a receber.
 *
 * Inclui as já vencidas de propósito: quem pergunta "quanto entra até o dia
 * 30" quer o que ainda não entrou, e separar o atrasado numa lista à parte
 * faria somar duas planilhas para responder uma pergunta. A coluna de
 * atraso distingue as duas.
 */
export function aVencerAte<T extends Pick<ParcelaAberta, "vencimento">>(
  parcelas: T[],
  ate: string,
): T[] {
  return parcelas.filter((parcela) => parcela.vencimento <= ate);
}

/**
 * O tipo do responsável, com o padrão de quem veio do Access.
 *
 * Os 118 responsáveis migrados não têm o campo — ele nasceu depois. O
 * schema já resolve isso com `default("ambos")`, mas o relatório lê o
 * documento cru, e indexar o rótulo com `undefined` imprimiria vazio
 * justamente na coluna que diz a quem ligar.
 */
export function tipoDoResponsavel(
  // `tipo` opcional **de propósito**: o schema o declara obrigatório com
  // `default`, mas o relatório lê o documento cru, onde os migrados não o
  // têm. Tipar como obrigatório aqui mentiria para quem chama.
  responsavel: ComTipo,
): TipoDeResponsavel {
  return responsavel.tipo ?? "ambos";
}

export interface ComTipo {
  tipo?: TipoDeResponsavel;
}

export function ehFinanceiro(responsavel: ComTipo): boolean {
  const tipo = tipoDoResponsavel(responsavel);

  return tipo === "financeiro" || tipo === "ambos";
}

/** `123.456.789-00`. Devolve o que veio quando não tem 11 dígitos. */
export function formatarCPF(cpf: string | null | undefined): string {
  if (!cpf) return "";

  const digitos = cpf.replace(/\D/g, "");
  if (digitos.length !== 11) return cpf;

  return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export type ResponsavelDoRelatorio = Pick<Responsavel, "nome"> &
  ComTipo & {
    cpf?: string | null;
    telefone?: string | null;
  };

/** `Maria Silva · 123.456.789-00 · Financeiro` */
export function descreverResponsavel(
  responsavel: ResponsavelDoRelatorio,
): string {
  return [
    responsavel.nome,
    formatarCPF(responsavel.cpf),
    ROTULOS_DE_TIPO_DE_RESPONSAVEL[tipoDoResponsavel(responsavel)],
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Todos os responsáveis do aluno, numa célula. */
export function descreverResponsaveis(
  responsaveis: ResponsavelDoRelatorio[],
): string {
  return responsaveis.map(descreverResponsavel).join(" / ");
}

/**
 * Quem a escola liga para cobrar.
 *
 * Fica em coluna própria, além da lista de todos: é o dado que a pessoa
 * procura ao abrir a planilha, e caçá-lo no meio de uma célula com três
 * nomes é o atrito que faz alguém ligar para a mãe errada.
 */
export function responsavelParaCobranca(
  responsaveis: ResponsavelDoRelatorio[],
): ResponsavelDoRelatorio | null {
  return responsaveis.find(ehFinanceiro) ?? responsaveis[0] ?? null;
}

export function telefoneDoResponsavel(
  responsavel: ResponsavelDoRelatorio | null,
): string {
  return responsavel?.telefone ? formatarTelefone(responsavel.telefone) : "";
}
