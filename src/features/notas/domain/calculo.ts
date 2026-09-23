import { FREQUENCIA_MINIMA } from "@/core/escola/frequencia";
import type {
  AvaliacoesDoTrimestre,
  Dependencia,
  SituacaoFinal,
  Trimestre,
} from "@/core/modelo";

/**
 * Cálculo de notas, média e situação.
 *
 * É a conta que reprova ou aprova um aluno, então mora aqui, pura, longe da
 * tela e do banco. As regras foram confirmadas com a direção (README, seção
 * 5.6):
 *
 *   média do trimestre = (Projeto + Tarefas + AV) ÷ 3
 *   média anual        = média dos três trimestres
 *   aprovado           = média ≥ 5,0 **e** frequência ≥ 75%
 *   recuperação        = só no fim do ano, para média anual < 5,0
 *   média final        = (média anual + recuperação) ÷ 2
 */

/** Média mínima para aprovação. */
export const MEDIA_MINIMA = 5;

/** Casas decimais do boletim. */
const CASAS = 1;

/**
 * Arredonda para uma casa, como o boletim mostra.
 *
 * O arredondamento acontece **antes** da comparação com a média mínima. Um
 * boletim que estampa "5,0" e diz "reprovado" — porque internamente era
 * 4,96 — é indefensável diante da família. O número que decide precisa ser o
 * número que aparece.
 */
export function arredondar(valor: number): number {
  const fator = 10 ** CASAS;

  return Math.round(valor * fator) / fator;
}

/**
 * Média do trimestre.
 *
 * `null` enquanto faltar qualquer uma das três avaliações. Dividir por 3 com
 * uma nota ausente trataria o que não foi lançado como zero, e um aluno com
 * Projeto 10 e Tarefas 10 apareceria com média 6,7 antes da AV — número que
 * assusta a família e não significa nada.
 */
export function mediaDoTrimestre(
  avaliacoes: AvaliacoesDoTrimestre | undefined,
): number | null {
  if (!avaliacoes) return null;

  const notas = [avaliacoes.projeto, avaliacoes.tarefas, avaliacoes.av];
  if (notas.some((nota) => nota === null || nota === undefined)) return null;

  const soma = notas.reduce<number>((total, nota) => total + (nota ?? 0), 0);

  return arredondar(soma / notas.length);
}

/**
 * Média anual: média dos três trimestres.
 *
 * `null` enquanto algum trimestre estiver incompleto — pelo mesmo motivo da
 * média do trimestre. O boletim mostra os trimestres fechados e deixa a
 * média anual em branco até o ano terminar.
 */
export function mediaAnual(
  mediasPorTrimestre: Readonly<Record<string, number | null>>,
): number | null {
  const medias = [1, 2, 3].map((t) => mediasPorTrimestre[String(t)] ?? null);
  if (medias.some((media) => media === null)) return null;

  const soma = medias.reduce<number>((total, media) => total + (media ?? 0), 0);

  return arredondar(soma / medias.length);
}

/** A média anual manda o aluno para a recuperação final? */
export function precisaDeRecuperacao(media: number | null): boolean {
  return media !== null && media < MEDIA_MINIMA;
}

/**
 * Média final após a recuperação: `(média anual + recuperação) ÷ 2`.
 *
 * Confirmado com a direção: a nota da recuperação **entra numa nova média**,
 * não substitui a anual. `null` quando não houve recuperação — aí a média
 * final é a própria média anual, e quem chama decide.
 */
export function mediaFinal(
  anual: number | null,
  recuperacao: number | null,
): number | null {
  if (anual === null) return null;
  if (recuperacao === null) return anual;

  return arredondar((anual + recuperacao) / 2);
}

export interface EntradaDeSituacao {
  mediaAnual: number | null;
  recuperacao: number | null;
  /** Frequência geral do aluno no ano, de 0 a 1. */
  percentualDeFrequencia: number | null;
}

/**
 * Situação do aluno numa disciplina.
 *
 * A frequência avaliada é a **geral do aluno no ano**, e não a da
 * disciplina: o limite de 25% é da carga horária total, então quem passa
 * dele reprova em tudo — é o que a lei determina e o que o colégio aplica.
 * A falta por disciplina continua no boletim, como informação para a
 * família e para o professor.
 *
 * Enquanto a média anual não fecha, a situação é `cursando`: o ano ainda
 * não acabou e nada foi decidido.
 */
export function situacaoDaDisciplina({
  mediaAnual: anual,
  recuperacao,
  percentualDeFrequencia,
}: EntradaDeSituacao): SituacaoFinal {
  if (anual === null) return "cursando";

  if (
    percentualDeFrequencia !== null &&
    percentualDeFrequencia < FREQUENCIA_MINIMA
  ) {
    return "reprovado-por-falta";
  }

  if (anual >= MEDIA_MINIMA) return "aprovado";

  // Média abaixo de 5,0 e recuperação ainda não lançada: o aluno está em
  // recuperação, não reprovado. A diferença importa — é o que a secretaria
  // usa para convocar as provas finais.
  if (recuperacao === null) return "recuperacao";

  const final = mediaFinal(anual, recuperacao);

  return final !== null && final >= MEDIA_MINIMA ? "aprovado" : "reprovado";
}

/**
 * Situação do aluno no ano, a partir das disciplinas.
 *
 * Uma reprovação basta para reprovar o ano; uma recuperação pendente
 * segura o resultado. Enquanto houver disciplina em curso, o ano está em
 * curso.
 */
export function situacaoDoAno(
  situacoes: readonly SituacaoFinal[],
): SituacaoFinal {
  if (situacoes.length === 0) return "cursando";
  if (situacoes.includes("reprovado-por-falta")) return "reprovado-por-falta";
  if (situacoes.includes("cursando")) return "cursando";
  if (situacoes.includes("recuperacao")) return "recuperacao";
  if (situacoes.includes("reprovado")) return "reprovado";

  return "aprovado";
}

/**
 * Dependência e reclassificação, que no boletim usam cálculo próprio:
 * `TOTAL = P1 + P2` e `MÉDIA = TOTAL ÷ 2`, com a mesma recuperação das
 * disciplinas regulares.
 */
export function calcularDependencia(
  dependencia: Pick<Dependencia, "p1" | "p2" | "recuperacao">,
): Pick<Dependencia, "total" | "media" | "situacao"> {
  const { p1, p2, recuperacao } = dependencia;

  if (p1 === null || p2 === null) {
    return { total: null, media: null, situacao: "cursando" };
  }

  const total = arredondar(p1 + p2);
  const media = arredondar(total / 2);

  return {
    total,
    media,
    situacao: situacaoDaDisciplina({
      mediaAnual: media,
      recuperacao,
      // A dependência é de um ano já encerrado; a frequência daquele ano não
      // é reavaliada aqui.
      percentualDeFrequencia: null,
    }),
  };
}

export interface LinhaCalculada {
  mediasPorTrimestre: Record<string, number | null>;
  mediaAnual: number | null;
  mediaFinal: number | null;
  situacao: SituacaoFinal;
}

/** Fecha uma linha do boletim a partir das avaliações lançadas. */
export function calcularLinha(
  trimestres: Readonly<Record<string, AvaliacoesDoTrimestre>>,
  recuperacao: number | null,
  percentualDeFrequencia: number | null,
): LinhaCalculada {
  const mediasPorTrimestre: Record<string, number | null> = {};

  for (const trimestre of [1, 2, 3] as Trimestre[]) {
    mediasPorTrimestre[String(trimestre)] = mediaDoTrimestre(
      trimestres[String(trimestre)],
    );
  }

  const anual = mediaAnual(mediasPorTrimestre);

  return {
    mediasPorTrimestre,
    mediaAnual: anual,
    mediaFinal: mediaFinal(anual, recuperacao),
    situacao: situacaoDaDisciplina({
      mediaAnual: anual,
      recuperacao,
      percentualDeFrequencia,
    }),
  };
}
