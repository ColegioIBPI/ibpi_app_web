import "server-only";

import { cookies } from "next/headers";

import { anoLetivoAtual, anosParaOSeletor } from "@/core/lib/ano-letivo";
import { COLECOES, type Turma } from "@/core/modelo";
import { getAdminDb } from "@/core/firebase/admin";

/**
 * Em que ano letivo a pessoa está trabalhando.
 *
 * O colégio não apaga nada na virada do ano: cada ano é um conjunto
 * próprio de turmas, vínculos, notas e boletins, e a secretaria **circula
 * entre eles**. Matricular em 2027 não toca em 2026; abrir 2026 em março
 * de 2027 é consulta ao histórico, não exceção.
 *
 * A escolha vive num **cookie**, e não na URL nem no navegador. Na URL
 * exigiria carregar `?ano=` em todo link, e uma tela esquecida devolveria
 * a pessoa ao ano errado sem avisar. No `localStorage` não serviria: quem
 * monta estas telas é o servidor, e ele não lê o navegador.
 *
 * A URL continua mandando quando traz `?ano=` — é como se manda um link
 * de 2026 para um colega sem mexer no ano em que ele está.
 */

export const COOKIE_DO_ANO = "ano-letivo";

/** Dez anos para trás e dois para a frente. Fora disso é engano ou ataque. */
function plausivel(ano: number): boolean {
  const atual = anoLetivoAtual();
  return Number.isInteger(ano) && ano >= atual - 10 && ano <= atual + 2;
}

/**
 * O ano escolhido, ou o corrente.
 *
 * Cookie com valor estranho é ignorado em silêncio: ele é do navegador, e
 * tratar lixo como erro de tela puniria a pessoa por algo que ela não
 * digitou.
 */
export async function anoLetivoEscolhido(): Promise<number> {
  const bruto = (await cookies()).get(COOKIE_DO_ANO)?.value;
  const ano = Number(bruto);

  return bruto && plausivel(ano) ? ano : anoLetivoAtual();
}

/**
 * O ano de uma tela: a URL primeiro, depois o escolhido.
 *
 * Toda tela que fala de um ano chama isto, para a resposta ser a mesma em
 * todas elas.
 */
export async function anoDaTela(
  naQuery: string | string[] | undefined,
): Promise<number> {
  const daUrl = Number(naQuery);

  return plausivel(daUrl) ? daUrl : anoLetivoEscolhido();
}

/**
 * Os anos que o colégio tem.
 *
 * Saem das **turmas**: criar a primeira turma de 2027 é o ato que abre o
 * ano, e assim a lista cresce sozinha em vez de depender de alguém
 * cadastrar o ano em outro lugar.
 *
 * O corrente entra sempre, mesmo sem turma nenhuma — senão, em janeiro de
 * um ano ainda não montado, o seletor não teria para onde ir.
 *
 * E o **escolhido** entra sempre, mesmo que suas turmas tenham sido
 * apagadas. Sem isso o seletor mostra um ano e a tela carrega outro: o
 * `<select>` não acha a opção do cookie e exibe a primeira da lista, e
 * clicar nela não muda valor nenhum — quem está no ano apagado fica preso
 * lá, sem conseguir voltar.
 */
export async function anosLetivosDisponiveis(): Promise<number[]> {
  const docs = await getAdminDb().collection(COLECOES.turmas).get();

  return anosParaOSeletor(
    docs.docs.map((doc) => (doc.data() as Turma).anoLetivo),
    anoLetivoAtual(),
    await anoLetivoEscolhido(),
    plausivel,
  );
}
