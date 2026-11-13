import { formatDate } from "@/core/lib/format";
import {
  ROTULOS_DE_SITUACAO_DA_MATRICULA,
  type SituacaoDaMatricula,
} from "@/core/modelo";

/**
 * A carteirinha do aluno.
 *
 * Um cartão não é uma tela de consulta: ele é **mostrado a alguém** — na
 * portaria, na excursão, na biblioteca —, e quem olha decide a partir dele.
 * Por isso a única regra que interessa aqui é a validade.
 *
 * Um cartão que continua bonito depois que o aluno saiu do colégio é pior
 * que nenhum cartão: ele transforma o sistema em emissor de documento
 * falso. Quem está fora **vê a carteirinha**, com o motivo escrito por
 * cima, em vez de ver uma tela de erro que não explica nada.
 */

export interface ParaCarteirinha {
  situacaoMatricula: SituacaoDaMatricula;
}

/**
 * A carteirinha vale o ano letivo e vence com ele.
 *
 * Não há data de emissão: o cartão é gerado a cada abertura, e uma data de
 * emissão impressa só diria quando a tela foi aberta.
 */
export function validadeDoAnoLetivo(anoLetivo: number): string {
  return `${anoLetivo}-12-31`;
}

export interface Validade {
  valida: boolean;
  /** Último dia em que o cartão vale, em ISO. */
  ate: string;
  /** Por que não vale. `null` quando vale. */
  motivo: string | null;
}

/**
 * A carteirinha vale?
 *
 * A situação da matrícula vem **antes** do vencimento: um aluno cancelado
 * em março não tem um cartão que vence em dezembro, tem um cartão que não
 * vale desde março. Dizer "vencida" nesse caso seria uma meia-verdade que
 * a portaria leria como "só precisa renovar".
 */
export function validadeDaCarteirinha(
  aluno: ParaCarteirinha,
  anoLetivo: number,
  hoje: string,
): Validade {
  const ate = validadeDoAnoLetivo(anoLetivo);

  if (aluno.situacaoMatricula !== "ativa") {
    return {
      valida: false,
      ate,
      motivo: `Matrícula ${ROTULOS_DE_SITUACAO_DA_MATRICULA[
        aluno.situacaoMatricula
      ].toLowerCase()}`,
    };
  }

  // Comparação de texto ISO: `"2027-01-02" > "2026-12-31"`. Não envolve
  // fuso, e é por isso que a data entra já convertida.
  if (hoje > ate) {
    return { valida: false, ate, motivo: `Vencida em ${formatDate(ate)}` };
  }

  return { valida: true, ate, motivo: null };
}

/**
 * A linha da série, montada do que existir.
 *
 * Duas coisas que vieram dos dados reais, não da imaginação:
 *
 * 1. **A série é guardada como número solto** — `"3"`, não "3ª série". Ao
 *    lado de `EM3A` isso vira "3 · EM3A", que não diz nada a quem lê o
 *    cartão. Dígito puro recebe o "ª série"; o resto sai como está, porque
 *    o EJA guarda texto ali.
 * 2. **Turma e série podem trazer o mesmo texto.** "EM1A · EM1A" seria o
 *    resultado de concatenar sem olhar.
 */
export function linhaDaTurma(
  turmaCodigo: string | null | undefined,
  serie: string | null | undefined,
): string {
  const partes = [porExtenso(serie), turmaCodigo?.trim()].filter(
    (parte): parte is string => Boolean(parte),
  );

  const distintas = [...new Set(partes)];

  return distintas.length > 0 ? distintas.join(" · ") : "—";
}

/** `"3"` → `"3ª série"`. `"E.J.A."` → `"E.J.A."`. */
function porExtenso(serie: string | null | undefined): string | undefined {
  const texto = serie?.trim();
  if (!texto) return undefined;

  return /^\d+$/.test(texto) ? `${texto}ª série` : texto;
}
