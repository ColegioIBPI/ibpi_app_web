import type { Role } from "@/core/auth/roles";
import { chaveDeComparacao } from "@/features/migracao/domain/texto";

/**
 * A Ajuda do sistema: o manual, dentro do Portal.
 *
 * Mora aqui, e não num arquivo à parte ou num site, por uma razão só:
 * **ajuda que exige ir procurar em outro lugar é ajuda que ninguém abre**.
 * A dúvida aparece com a tela na frente, e é ali que a resposta precisa
 * estar — a um clique do menu, com a pessoa já identificada.
 *
 * O conteúdo é **dado tipado**, não Markdown. Não é purismo: o texto fala
 * de perfis (`Role`) e de telas, e tipar isso faz o TypeScript avisar
 * quando um perfil deixa de existir ou muda de nome. Um `.md` envelheceria
 * em silêncio, que é exatamente como manual morre.
 */

/**
 * Trecho com destaque: `"O **aluno** não vê"`.
 *
 * Uma convenção mínima em vez de um renderizador de Markdown. Negrito é a
 * única marcação que o manual usa dentro de uma frase, e trazer um parser
 * inteiro para isso seria uma dependência a manter por causa de dois
 * asteriscos.
 */
export type Texto = string;

export interface Celula {
  rotulo: Texto;
  valor: Texto;
}

export type Bloco =
  | { tipo: "paragrafo"; texto: Texto }
  | { tipo: "lista"; itens: Texto[] }
  /** Numerada: a ordem é parte da informação. */
  | { tipo: "passos"; itens: Texto[] }
  | { tipo: "tabela"; linhas: Celula[] }
  /**
   * O quadro destacado. `cuidado` é para o que **não se desfaz** — some o
   * resto e o leitor para de ver o que importa.
   */
  | { tipo: "aviso"; tom: "nota" | "cuidado"; texto: Texto };

export interface Topico {
  /** Vira o endereço: `/gestao/ajuda/liberacao-do-boletim`. */
  id: string;
  titulo: string;
  /** Uma linha. É o que aparece no cartão e o que a busca lê primeiro. */
  resumo: string;
  /**
   * De quem é o assunto.
   *
   * `"todos"` para o que vale para a equipe inteira. O recorte serve ao
   * filtro "só o que é da minha função" — e ele é **preferência de
   * leitura, não permissão**: quem quiser ver tudo clica e vê. Esconder
   * de verdade é trabalho da matriz de acesso, não da ajuda.
   */
  perfis: Role[] | "todos";
  /** A tela de que o tópico fala: `"Gestão › Boletins"`. */
  onde?: string;
  blocos: Bloco[];
}

/** O tópico é do interesse deste perfil? */
export function ehDoPerfil(topico: Topico, role: Role): boolean {
  return topico.perfis === "todos" || topico.perfis.includes(role);
}

/**
 * Busca por título, resumo e corpo, sem acento e sem diferenciar
 * maiúsculas.
 *
 * Procura **todas** as palavras digitadas, em qualquer ordem e em qualquer
 * parte do tópico: quem busca "liberar boletim" não vai digitar a frase do
 * título. Busca vazia devolve tudo — a tela sem filtro é a lista inteira.
 */
export function buscarTopicos(topicos: readonly Topico[], termo: string): Topico[] {
  const palavras = chaveDeComparacao(termo).split(" ").filter(Boolean);
  if (palavras.length === 0) return [...topicos];

  return topicos.filter((topico) => {
    const alvo = textoParaBusca(topico);
    return palavras.every((palavra) => alvo.includes(palavra));
  });
}

/** Todo o texto do tópico, achatado, para a busca varrer de uma vez. */
export function textoParaBusca(topico: Topico): string {
  const pedacos: string[] = [topico.titulo, topico.resumo, topico.onde ?? ""];

  for (const bloco of topico.blocos) {
    if (bloco.tipo === "paragrafo" || bloco.tipo === "aviso") {
      pedacos.push(bloco.texto);
    } else if (bloco.tipo === "lista" || bloco.tipo === "passos") {
      pedacos.push(...bloco.itens);
    } else {
      for (const linha of bloco.linhas) pedacos.push(linha.rotulo, linha.valor);
    }
  }

  return chaveDeComparacao(pedacos.join(" "));
}

export interface Pedaco {
  texto: string;
  forte: boolean;
}

/**
 * Quebra `"O **aluno** não vê"` em pedaços para a tela montar.
 *
 * Asterisco solto ou par não fechado fica como está: o texto é escrito à
 * mão, e um destaque esquecido não pode virar conteúdo sumido.
 */
export function destacar(texto: Texto): Pedaco[] {
  return texto
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((pedaco) => pedaco !== "")
    .map((pedaco) =>
      pedaco.startsWith("**") && pedaco.endsWith("**") && pedaco.length > 4
        ? { texto: pedaco.slice(2, -2), forte: true }
        : { texto: pedaco, forte: false },
    );
}
