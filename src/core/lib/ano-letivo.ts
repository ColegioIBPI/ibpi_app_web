import { paraData } from "@/core/lib/datas";
import type { Trimestre } from "@/core/modelo";

/**
 * Ano letivo e trimestre corrente.
 *
 * O calendário do colégio (datas exatas de início e fim de cada trimestre)
 * ainda não está cadastrado no sistema. Até lá, o trimestre é **sugerido**
 * pelo mês — o suficiente para abrir o diário já no trimestre certo, e o
 * professor troca no seletor quando a virada não bater com o calendário.
 *
 * Nada é gravado a partir daqui: a sugestão só escolhe o valor inicial de
 * um campo que a pessoa vê e pode mudar.
 */

/** Divisão aproximada do ano letivo brasileiro (fev–dez). */
export function trimestreSugerido(valor: Date | string = new Date()): Trimestre {
  const mes = paraData(valor).getMonth() + 1;

  if (mes <= 5) return 1;
  if (mes <= 8) return 2;

  return 3;
}

/**
 * Ano letivo corrente.
 *
 * Janeiro é férias: quem abre o sistema em janeiro está fechando o ano
 * anterior (recuperação, boletim), não começando o próximo.
 */
export function anoLetivoAtual(valor: Date | string = new Date()): number {
  const data = paraData(valor);
  const ano = data.getFullYear();

  return data.getMonth() === 0 ? ano - 1 : ano;
}

/** Converte texto de query string em trimestre, ou devolve o sugerido. */
export function trimestreDaQuery(
  valor: string | string[] | undefined,
  padrao: Trimestre = trimestreSugerido(),
): Trimestre {
  const numero = Number(valor);

  return numero === 1 || numero === 2 || numero === 3 ? numero : padrao;
}
