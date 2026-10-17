import type { ItemDoRecibo, Recibo } from "@/core/modelo";

/**
 * Como se lê e se soma um recibo.
 *
 * Funções puras: a prévia na tela e a gravação no servidor usam as mesmas,
 * então o total que a secretaria confere antes de imprimir é, por
 * construção, o total que fica no banco.
 */

/**
 * O total do recibo.
 *
 * **Somado em centavos.** Somar reais em ponto flutuante acumula erro —
 * `0.1 + 0.2` não dá `0.3` —, e num recibo o centavo que falta é o centavo
 * que a família aponta com o dedo. É a mesma conta que o carnê já faz.
 *
 * **Não é gravado**, é concluído na leitura. Guardar o total criaria duas
 * verdades sobre o mesmo papel, e nada impediria a soma de envelhecer. O
 * risco de divergência que existe em `cobrancas` não existe aqui: recibo
 * não se edita.
 */
export function totalDoRecibo(itens: ItemDoRecibo[]): number {
  const centavos = itens.reduce(
    (soma, item) => soma + Math.round(item.valor * 100),
    0,
  );

  return centavos / 100;
}

export function ehCancelado(recibo: Pick<Recibo, "status">): boolean {
  return recibo.status === "cancelado";
}

/**
 * Cancelar só vale uma vez.
 *
 * Cancelar de novo não desfaz nada e sobrescreveria o motivo e a data do
 * cancelamento original — que é o que alguém vai procurar no fechamento.
 */
export function podeCancelar(recibo: Pick<Recibo, "status">): boolean {
  return !ehCancelado(recibo);
}

/**
 * O id do documento, que é também como o recibo é procurado: `A-000042`.
 *
 * Determinístico de propósito. Com id gerado pelo Firestore, duas emissões
 * simultâneas que lessem o mesmo contador criariam dois documentos com o
 * mesmo número e ninguém saberia. Assim, a segunda falha na gravação.
 */
export function idDoRecibo(serie: string, numero: number): string {
  return `${serie.toUpperCase()}-${String(numero).padStart(6, "0")}`;
}

/** Como o número aparece para quem lê: `Série A · nº 42`. */
export function identificacao(recibo: Pick<Recibo, "serie" | "numero">): string {
  return `Série ${recibo.serie} · nº ${recibo.numero}`;
}

/**
 * A série do talão é guardada em maiúsculas.
 *
 * Sem isso, `a` e `A` seriam dois contadores diferentes para o mesmo talão
 * — e o segundo começaria do número 1, repetindo recibos que já existem.
 */
export function normalizarSerie(serie: string): string {
  return serie.trim().toUpperCase();
}
