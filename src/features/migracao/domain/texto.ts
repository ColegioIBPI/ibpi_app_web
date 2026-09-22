/**
 * Limpeza dos textos vindos do Access.
 *
 * A base legada foi preenchida à mão por anos, e carrega os vícios disso:
 * campo preenchido com barras para dizer "não tem", e-mail com anotação no
 * meio ("fulano@x.com ( Mãe"), espaço sobrando, grafia oscilante.
 *
 * Todas as funções aqui são puras — é o que permite testar cada vício
 * encontrado na base real sem abrir o banco.
 */

/** Marcas de "campo vazio" usadas na digitação, além do vazio de verdade. */
const PLACEHOLDERS = /^[\s/\-.*_x]*$/i;

/**
 * Devolve o texto limpo, ou `null` quando o campo não tem conteúdo real.
 *
 * `"////////////////"` e `"---"` aparecem na base querendo dizer "sem
 * segundo responsável". Mantê-los viraria um responsável chamado "////".
 */
export function limparTexto(valor: unknown): string | null {
  // O Access guarda matrícula, CPF e código como número. Recusá-los aqui
  // descartaria o aluno inteiro por causa do tipo da coluna.
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? String(valor) : null;
  }

  if (typeof valor !== "string") return null;

  const limpo = valor.replace(/\s+/g, " ").trim();
  if (limpo === "" || PLACEHOLDERS.test(limpo)) return null;

  return limpo;
}

/**
 * Chave para comparar nomes entre fontes diferentes (Access × planilha):
 * sem acento, sem pontuação, maiúsculo, espaços colapsados.
 */
export function chaveDeComparacao(valor: unknown): string {
  const texto = limparTexto(valor);
  if (!texto) return "";

  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Extrai os e-mails de um campo que pode ter anotação junto.
 *
 * Exemplo real da base: `"regobato@gmail.com ( Mãe"` → `["regobato@gmail.com"]`
 */
export function extrairEmails(valor: unknown): string[] {
  const texto = limparTexto(valor);
  if (!texto) return [];

  const encontrados = texto.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) ?? [];

  return [
    ...new Set(
      encontrados.map((email) => email.toLowerCase().replace(/[.,;]+$/, "")),
    ),
  ];
}

/** Primeiro e-mail do campo, ou `null`. */
export function extrairEmail(valor: unknown): string | null {
  return extrairEmails(valor)[0] ?? null;
}

/**
 * Telefone só com dígitos, no formato E.164 brasileiro.
 *
 * `"(61)99976-0810"` → `"+5561999760810"`. Guardar normalizado é o que
 * permite comparar e, mais para a frente, integrar com WhatsApp sem
 * reprocessar a base.
 */
export function normalizarTelefone(valor: unknown): string | null {
  const texto = limparTexto(valor);
  if (!texto) return null;

  const digitos = texto.replace(/\D/g, "");

  // Telefone brasileiro tem 10 (fixo) ou 11 (celular) dígitos com DDD.
  if (digitos.length === 10 || digitos.length === 11) return `+55${digitos}`;
  if (digitos.length === 12 || digitos.length === 13) {
    return digitos.startsWith("55") ? `+${digitos}` : null;
  }

  return null;
}

/** CPF só com dígitos, ou `null` se não tiver 11. */
export function normalizarCpf(valor: unknown): string | null {
  const texto = limparTexto(valor);
  if (!texto) return null;

  const digitos = texto.replace(/\D/g, "").padStart(11, "0");

  return digitos.length === 11 ? digitos : null;
}

/**
 * Nome próprio com a capitalização arrumada, preservando as partículas.
 *
 * A base mistura `"MARIA DA SILVA"` e `"Maria da Silva"`; a listagem da
 * secretaria fica ilegível com os dois formatos na mesma tela.
 */
const PARTICULAS = new Set(["da", "de", "do", "das", "dos", "e", "di", "du"]);

export function normalizarNome(valor: unknown): string | null {
  const texto = limparTexto(valor);
  if (!texto) return null;

  return texto
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((palavra, indice) => {
      if (indice > 0 && PARTICULAS.has(palavra)) return palavra;
      return palavra.charAt(0).toLocaleUpperCase("pt-BR") + palavra.slice(1);
    })
    .join(" ");
}
