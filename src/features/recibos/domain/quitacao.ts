import type {
  Cobranca,
  FormaDePagamento,
  FormaDePagamentoDoRecibo,
  TipoDeCobranca,
  TipoDeServico,
} from "@/core/modelo";

/**
 * A quitação: o que acontece com a parcela quando o recibo a liquida.
 *
 * Emitir recibo de uma mensalidade **é** dar baixa nela. Separar os dois
 * atos obrigaria a secretaria a lançar a mesma informação duas vezes, e
 * bastaria esquecer a segunda para o extrato cobrar de novo quem já pagou
 * — com o recibo na mão para provar.
 */

/**
 * A bandeira não cabe na parcela.
 *
 * O recibo distingue Visa de Master porque é o que aparece no extrato da
 * maquininha; `cobrancas` para em "cartão de crédito". Converter aqui, numa
 * função testada, em vez de no meio da transação: um `as` silencioso
 * gravaria `credito-visa` num campo que não conhece esse valor, e o extrato
 * passaria a mostrar vazio na coluna de forma de pagamento.
 */
export function formaDaParcela(
  forma: FormaDePagamentoDoRecibo,
): FormaDePagamento {
  switch (forma) {
    case "debito-master":
    case "debito-visa":
    case "debito-outro":
      return "cartao-de-debito";
    case "credito-visa":
    case "credito-master":
    case "credito-outro":
      return "cartao-de-credito";
    default:
      return forma;
  }
}

/**
 * O serviço do recibo que corresponde ao tipo da parcela.
 *
 * `extras` não existe no vocabulário do recibo e vira `outros`, que é o que
 * ele significa.
 *
 * **Parcela sem tipo também vira `outros`**, e não `mensalidade`. As 847
 * migradas do Access não trazem o campo, e preencher "mensalidade" por
 * padrão inventaria no recibo — documento que a família guarda — um dado
 * que ninguém conferiu. Quem emite escolhe, se for outra coisa.
 */
export function servicoDaParcela(
  tipo: TipoDeCobranca | null | undefined,
): TipoDeServico {
  switch (tipo) {
    case "taxa-de-matricula":
    case "taxa-de-material":
    case "mensalidade":
    case "reclassificacao":
    case "dependencia":
      return tipo;
    default:
      return "outros";
  }
}

/** `Parcela 5/12`, ou só o vencimento quando a parcela não é de carnê. */
export function referenciaDaParcela(
  cobranca: Pick<Cobranca, "parcela" | "totalDeParcelas">,
): string {
  return cobranca.parcela && cobranca.totalDeParcelas
    ? `Parcela ${cobranca.parcela}/${cobranca.totalDeParcelas}`
    : "";
}

export interface Impedimento {
  motivo: string;
}

/**
 * A parcela pode ser quitada por este recibo?
 *
 * Verificado **dentro da transação**, e não só na tela: entre a secretaria
 * ver a lista de parcelas em aberto e clicar em emitir, o financeiro pode
 * ter dado baixa na mesma parcela. Sem esta conferência, o segundo recibo
 * passaria por cima do primeiro pagamento.
 */
export function impedimentoParaQuitar(
  cobranca: Pick<Cobranca, "matricula" | "dataPagamento"> | null,
  matricula: string,
): Impedimento | null {
  if (!cobranca) {
    return { motivo: "A parcela não existe mais." };
  }

  if (cobranca.matricula !== matricula) {
    return { motivo: "A parcela é de outro aluno." };
  }

  if (cobranca.dataPagamento) {
    return { motivo: "A parcela já está paga." };
  }

  return null;
}

/**
 * O cancelamento do recibo desfaz a baixa — mas **só se a parcela ainda
 * aponta para ele**.
 *
 * Sem essa conferência, cancelar um recibo antigo apagaria o pagamento que
 * um recibo mais novo já lançou na mesma parcela: a família ficaria devendo
 * de novo uma mensalidade que pagou duas vezes.
 */
export function aindaQuitadaPor(
  cobranca: Pick<Cobranca, "reciboId">,
  reciboId: string,
): boolean {
  return cobranca.reciboId === reciboId;
}

/** `2026-03-10T12:00:00Z` → `2026-03-10`, no fuso do colégio. */
export function dataNoBrasil(momento: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(momento));
}
