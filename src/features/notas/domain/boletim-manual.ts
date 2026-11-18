import {
  COLUNAS_OBRIGATORIAS,
  ROTULOS_PADRAO_DO_BOLETIM,
  type BoletimManual,
  type ColunaDoBoletim,
  type LinhaDoBoletim,
} from "@/core/modelo";

/**
 * Regras do boletim 2 — a cópia de valores fixos.
 *
 * O que decide o que a família vê, o que o papel mostra e quando um número
 * digitado contradiz os outros. Fica aqui, e não na tela, porque a mesma
 * decisão é tomada no Portal, na impressão e no serviço que o aplicativo
 * um dia vai ler.
 */

/** O que define um retrato: só o que existe no momento da cópia. */
export interface ParaCopiar {
  disciplinas: LinhaDoBoletim[];
  faltasPorTrimestre: Record<string, number>;
  percentualDeFrequencia: number | null;
  situacao: BoletimManual["situacao"];
  observacoes?: string | null;
}

/**
 * O retrato do boletim calculado, pronto para virar documento.
 *
 * Copia **valor por valor**, inclusive as médias já calculadas. É o ponto
 * do recurso: a partir daqui nada se recalcula, e uma nota corrigida pelo
 * professor não muda mais este papel. Quem quiser o número novo tira outra
 * cópia.
 */
export function copiarDoCalculado(origem: ParaCopiar) {
  return {
    /*
      Cópia profunda, e **três níveis**: a linha, o mapa de trimestres e
      o objeto de avaliações dentro de cada um. Espalhar só os dois
      primeiros deixa `{projeto, tarefas, av}` compartilhado — o teste
      pegou isso aqui, mudando a origem e vendo a cópia mudar junto.
    */
    disciplinas: origem.disciplinas.map((linha) => ({
      ...linha,
      trimestres: Object.fromEntries(
        Object.entries(linha.trimestres ?? {}).map(([trimestre, avaliacoes]) => [
          trimestre,
          { ...avaliacoes },
        ]),
      ),
      mediasPorTrimestre: { ...linha.mediasPorTrimestre },
    })),
    faltasPorTrimestre: { ...origem.faltasPorTrimestre },
    percentualDeFrequencia: origem.percentualDeFrequencia,
    situacao: origem.situacao,
    observacoes: origem.observacoes ?? null,
  };
}

/** O rótulo que vale para uma coluna: o do colégio, ou o que foi trocado. */
export function rotuloDaColuna(
  coluna: ColunaDoBoletim,
  rotulos: BoletimManual["rotulos"] | undefined,
): string {
  return rotulos?.[coluna]?.trim() || ROTULOS_PADRAO_DO_BOLETIM[coluna];
}

/**
 * A coluna aparece?
 *
 * Três não se escondem: sem disciplina o quadro não diz de que matéria é
 * a linha, e sem as médias o boletim deixa de ser boletim. Pedir para
 * esconder uma delas é ignorado, em vez de recusado — é a tela que não
 * deve oferecer.
 */
export function colunaVisivel(
  coluna: ColunaDoBoletim,
  ocultas: ColunaDoBoletim[] | undefined,
): boolean {
  if (COLUNAS_OBRIGATORIAS.includes(coluna)) return true;

  return !(ocultas ?? []).includes(coluna);
}

/**
 * Qual boletim vale para quem está olhando.
 *
 * Uma pergunta, um lugar. O Portal, a impressão e a tela da secretaria
 * precisam concordar — e foi para isso que `oficial` virou um campo do
 * próprio documento, em vez de uma marca no boletim calculado: a Security
 * Rule consegue lê-lo sem buscar outro documento, que é o que o
 * aplicativo vai precisar.
 */
export function boletimQueVale<T extends { oficial: boolean }>(
  manual: T | null | undefined,
): "calculado" | "manual" {
  return manual?.oficial ? "manual" : "calculado";
}

/** O que o componente do boletim precisa para desenhar o quadro. */
export interface QuadroDoBoletim {
  disciplinas: LinhaDoBoletim[];
  faltasPorTrimestre: Record<string, number>;
  percentualDeFrequencia: number | null;
  situacao: BoletimManual["situacao"];
  observacoes: string | null;
  rotulos?: BoletimManual["rotulos"];
  ocultas?: ColunaDoBoletim[];
}

/**
 * O quadro que vale: o calculado, ou o boletim 2 quando ele é o oficial.
 *
 * Existe para a escolha ser feita **uma vez**. Ela aparece na tela da
 * secretaria, no Portal da família e na impressão, e as três têm de
 * concordar — um boletim que imprime diferente do que a tela mostra é a
 * pior falha possível neste documento.
 */
export function quadroQueVale(boletim: {
  oficial: "calculado" | "manual";
  manual: BoletimManual | null;
  disciplinas: LinhaDoBoletim[];
  faltasPorTrimestre: Record<string, number>;
  percentualDeFrequencia: number | null;
  situacao: BoletimManual["situacao"];
  observacoes?: string | null;
}): QuadroDoBoletim {
  if (boletim.oficial === "manual" && boletim.manual) {
    const manual = boletim.manual;

    return {
      disciplinas: manual.disciplinas,
      faltasPorTrimestre: manual.faltasPorTrimestre,
      percentualDeFrequencia: manual.percentualDeFrequencia,
      situacao: manual.situacao,
      observacoes: manual.observacoes ?? null,
      rotulos: manual.rotulos,
      ocultas: manual.ocultas,
    };
  }

  return {
    disciplinas: boletim.disciplinas,
    faltasPorTrimestre: boletim.faltasPorTrimestre,
    percentualDeFrequencia: boletim.percentualDeFrequencia,
    situacao: boletim.situacao,
    observacoes: boletim.observacoes ?? null,
  };
}

/**
 * A média digitada bate com as três avaliações daquele trimestre?
 *
 * `null` quando não há o que comparar — falta avaliação, ou a média está
 * em branco. A tela usa isto para **marcar**, não para impedir: divergir é
 * justamente o que este boletim permite, e o aviso existe para a
 * divergência ser escolhida e não um erro de digitação.
 */
export function divergenciaDaMedia(
  avaliacoes: { projeto: number | null; tarefas: number | null; av: number | null } | undefined,
  media: number | null | undefined,
): number | null {
  if (media == null || !avaliacoes) return null;

  const valores = [avaliacoes.projeto, avaliacoes.tarefas, avaliacoes.av];
  if (valores.some((valor) => valor == null)) return null;

  const calculada =
    (valores as number[]).reduce((soma, valor) => soma + valor, 0) / 3;
  const diferenca = Math.abs(calculada - media);

  // Duas casas: é a precisão que o boletim imprime. Abaixo disso a
  // diferença não existe no papel, e apontá-la seria ruído.
  return diferenca < 0.005 ? null : calculada;
}
