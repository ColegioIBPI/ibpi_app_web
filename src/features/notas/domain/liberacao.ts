import type { Boletim, LiberacaoDoBoletim } from "@/core/modelo";

/**
 * Liberação do boletim para a família.
 *
 * As notas são lançadas aos poucos ao longo do trimestre. Um boletim meio
 * preenchido é lido como "meu filho está indo mal" por quem não sabe que
 * faltam avaliações — então a família só vê o trimestre depois que a
 * secretaria o libera, aluno por aluno.
 *
 * **O que não foi liberado não é escondido: não é entregue.** O serviço
 * recorta antes de montar a tela, e a Security Rule nega a nota crua ao
 * aplicativo. Esconder na interface deixaria o dado ao alcance de quem
 * olhasse a resposta da rede.
 */

/** Os três do ano letivo, na ordem. */
export const TRIMESTRES = ["1", "2", "3"] as const;

export type Trimestre = (typeof TRIMESTRES)[number];

export type ComLiberacoes = Pick<Boletim, "liberacoes">;

export function estaLiberado(
  boletim: ComLiberacoes | null,
  trimestre: string,
): boolean {
  return Boolean(boletim?.liberacoes?.[trimestre]);
}

/** Os trimestres liberados, em ordem. */
export function trimestresLiberados(boletim: ComLiberacoes | null): string[] {
  return TRIMESTRES.filter((trimestre) => estaLiberado(boletim, trimestre));
}

/**
 * O último trimestre liberado — o "boletim atual" da família.
 *
 * `null` quando nada foi liberado: a família não vê boletim nenhum, e isso
 * é diferente de ver um boletim vazio.
 */
export function ultimoLiberado(boletim: ComLiberacoes | null): string | null {
  const liberados = trimestresLiberados(boletim);

  return liberados.length > 0 ? liberados[liberados.length - 1] : null;
}

export function quemLiberou(
  boletim: ComLiberacoes | null,
  trimestre: string,
): LiberacaoDoBoletim | null {
  return boletim?.liberacoes?.[trimestre] ?? null;
}

/** A marcação a gravar. Desmarcar apaga o registro. */
export function marcarLiberacao(
  liberacoes: Boletim["liberacoes"] | undefined,
  trimestre: string,
  liberar: boolean,
  porNome: string,
  agora = new Date().toISOString(),
): Boletim["liberacoes"] {
  const proximas = { ...(liberacoes ?? {}) };

  if (liberar) {
    proximas[trimestre] = { em: agora, porNome };
  } else {
    // Recolher apaga o registro em vez de guardar "liberado: false": o que
    // interessa saber depois é **quando foi liberado**, e um registro que
    // diz "não liberado desde ontem" não responde isso.
    delete proximas[trimestre];
  }

  return proximas;
}

export interface ComTrimestre {
  trimestre: number | string;
}

/**
 * Recorta a lista de notas, deixando só as dos trimestres liberados.
 *
 * Usado no servidor antes de montar o boletim da família. O trimestre vem
 * como número na nota e como texto na chave da liberação — a conversão é
 * feita aqui, num lugar só, porque comparar `1` com `"1"` é o tipo de erro
 * que entrega o boletim inteiro.
 */
export function somenteLiberadas<T extends ComTrimestre>(
  notas: T[],
  boletim: ComLiberacoes | null,
): T[] {
  const liberados = new Set(trimestresLiberados(boletim));

  return notas.filter((nota) => liberados.has(String(nota.trimestre)));
}
