import { fimDoDia, paraData, paraDataISO } from "@/core/lib/datas";
import {
  chaveDeComparacao,
  limparTexto,
} from "@/features/migracao/domain/texto";

/**
 * Leitura do financeiro do Access.
 *
 * Duas tabelas, com papéis diferentes:
 *
 * - `Tabela_pagamento` — as **parcelas**: vencimento, valor, e a baixa
 *   quando foi paga. 847 linhas.
 * - `Fatos` — os **itens contratados** do ano: anuidade, matrícula, taxa de
 *   material, dependência, reclassificação. 274 linhas.
 *
 * O nome "Fatos" sugere ocorrência disciplinar, e não é: a ocorrência de
 * comportamento vive na planilha de frequência, não no Access.
 */

export type SituacaoDaCobranca = "paga" | "vencida" | "aberta";

export interface Parcela {
  numero: number;
  total: number;
}

/** `"3/12"` → `{ numero: 3, total: 12 }`. */
export function parsearParcela(valor: unknown): Parcela | null {
  const texto = limparTexto(valor);
  if (!texto) return null;

  const partes = texto.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!partes) return null;

  const numero = Number(partes[1]);
  const total = Number(partes[2]);

  if (numero < 1 || total < 1 || numero > total) return null;

  return { numero, total };
}

/**
 * Situação da parcela.
 *
 * A data de pagamento é o que define "paga" — o valor pago pode divergir
 * (desconto, juros) sem mudar o fato de ter sido quitada.
 */
export function situacaoDaCobranca(entrada: {
  vencimento: Date | string | null;
  dataPagamento: Date | string | null;
  hoje?: Date;
}): SituacaoDaCobranca {
  if (entrada.dataPagamento) return "paga";
  if (!entrada.vencimento) return "aberta";

  const vencimento = paraData(entrada.vencimento);
  if (Number.isNaN(vencimento.getTime())) return "aberta";

  const hoje = entrada.hoje ?? new Date();

  // Vence no fim do dia: quem paga no próprio dia do vencimento está em dia.
  return hoje > fimDoDia(vencimento) ? "vencida" : "aberta";
}

export type TipoDeContrato =
  | "anuidade"
  | "matricula"
  | "taxa-material"
  | "dependencia"
  | "reclassificacao"
  | "outros";

const TIPOS: Record<string, TipoDeContrato> = {
  ANUIDADE: "anuidade",
  MATRICULA: "matricula",
  "TX DE MATERIAL": "taxa-material",
  DEPENDENCIA: "dependencia",
  RECLASSIFICACAO: "reclassificacao",
  OUTROS: "outros",
};

export function tipoDeContrato(valor: unknown): TipoDeContrato {
  return TIPOS[chaveDeComparacao(valor)] ?? "outros";
}

export interface Contrato {
  tipo: TipoDeContrato;
  /** Valor da parcela, quando o texto traz parcelamento; senão, o total. */
  valor: number | null;
  parcelas: number | null;
  /** `cartao`, `boleto`, ou `null` quando não está escrito. */
  plano: string | null;
  /** O texto original, sempre preservado para conferência. */
  descricao: string;
}

/**
 * Interpreta o texto livre do campo `Ocorrencia`.
 *
 * Formatos reais encontrados:
 *   `"R$2.940,00"`
 *   `"12XR$1.923,00 Plano Cartão"`
 *   `"12XR$2.564,00 Plano Boleto"`
 *
 * O valor é guardado em reais como número; o texto original fica junto,
 * porque nenhuma interpretação de campo livre é confiável o bastante para
 * apagar a origem.
 */
export function parsearContrato(
  tipo: unknown,
  descricao: unknown,
): Contrato | null {
  const texto = limparTexto(descricao);
  if (!texto) return null;

  const parcelas = texto.match(/(\d+)\s*[xX]\s*R\$/);
  const valor = texto.match(/R\$\s*([\d.]+,\d{2}|\d+(?:\.\d{3})*|\d+)/);
  // `\w` não casa com "ã", e o plano na base é "Plano Cartão".
  const plano = texto.match(/plano\s+(\p{L}+)/iu);

  return {
    tipo: tipoDeContrato(tipo),
    valor: valor ? parsearValor(valor[1]) : null,
    parcelas: parcelas ? Number(parcelas[1]) : null,
    plano: plano ? chaveDeComparacao(plano[1]).toLowerCase() : null,
    descricao: texto,
  };
}

/** `"1.923,00"` → `1923`. Formato brasileiro: ponto separa milhar. */
export function parsearValor(valor: unknown): number | null {
  const texto = limparTexto(valor);
  if (!texto) return null;

  const numero = Number(
    texto
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  );

  return Number.isFinite(numero) ? numero : null;
}

/**
 * Id determinístico da cobrança: rodar a migração duas vezes tem que
 * sobrescrever a mesma parcela, não criar uma segunda.
 *
 * Matrícula + vencimento + parcela **não bastam**. Na base real, taxa de
 * matrícula e taxa de material do mesmo aluno são quitadas no mesmo dia e
 * ambas ficam registradas como parcela "1/1" — 37 pares assim. Sem o
 * `distintivo`, uma apagaria a outra.
 *
 * O `distintivo` é o conteúdo que diferencia as duas (valor e observação);
 * ele entra como hash curto para o id continuar legível.
 */
export function idDaCobranca(
  matricula: string,
  vencimento: Date | string,
  parcela: Parcela | null,
  distintivo?: string,
): string {
  const sufixo = parcela ? `${parcela.numero}de${parcela.total}` : "unica";
  const hash = distintivo ? `-${hashCurto(distintivo)}` : "";

  return `${matricula}-${paraDataISO(vencimento)}-${sufixo}${hash}`;
}

/**
 * Hash curto e estável (FNV-1a em base 36).
 *
 * Não é criptográfico — serve só para separar registros que, de resto, são
 * idênticos. O que importa aqui é ser determinístico: o mesmo conteúdo tem
 * que gerar o mesmo id em toda execução, senão a migração deixa de ser
 * idempotente.
 */
export function hashCurto(valor: string): string {
  let hash = 2166136261;

  for (let i = 0; i < valor.length; i += 1) {
    hash ^= valor.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36).padStart(6, "0").slice(0, 6);
}
