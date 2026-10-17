import type { Ocorrencia } from "@/core/modelo";

/**
 * Quem, fora da equipe, enxerga uma ocorrência.
 *
 * A equipe escolar lê todas — é ela que registra e que atende a família. O
 * que estes dois campos decidem é a **publicação**: se aquele registro
 * chega ao responsável e se chega ao aluno.
 *
 * Ocorrência não é aviso. Um "comportamento inadequado" descrito para a
 * coordenação nem sempre é o texto que se quer na mão do aluno de 14 anos,
 * e às vezes é exatamente o que o responsável precisa ler antes da reunião.
 * Por isso são dois campos, e não um.
 */

export type ParaPublicacao = Pick<
  Ocorrencia,
  "visivelParaResponsavel" | "visivelParaAluno"
>;

/**
 * O responsável lê, **a menos que alguém tenha retido**.
 *
 * Ausente é "como era antes do campo existir": até aqui o responsável via
 * todas as ocorrências dos filhos. Tratar a ausência como retida faria a
 * família deixar de ver, de uma hora para outra, o que já via — e ninguém
 * notaria, porque o que some não avisa. É o mesmo raciocínio de
 * `confirmado` em `cobrancas`.
 *
 * Só o `false` **explícito** retém.
 */
export function visivelParaResponsavel(ocorrencia: ParaPublicacao): boolean {
  return ocorrencia.visivelParaResponsavel !== false;
}

/**
 * O aluno só lê o que foi marcado para ele.
 *
 * O contrário do responsável, e pela mesma lógica de preservar o que já
 * valia: o aluno nunca viu ocorrência nenhuma, então ausente é "não".
 */
export function visivelParaAluno(ocorrencia: ParaPublicacao): boolean {
  return ocorrencia.visivelParaAluno === true;
}

/** Filtra a lista pelo papel de quem está lendo. */
export function publicadasPara<T extends ParaPublicacao>(
  ocorrencias: T[],
  papel: "responsavel" | "aluno",
): T[] {
  const enxerga =
    papel === "aluno" ? visivelParaAluno : visivelParaResponsavel;

  return ocorrencias.filter(enxerga);
}

/** Como a tela da equipe resume a publicação de uma ocorrência. */
export function resumoDaPublicacao(ocorrencia: ParaPublicacao): string {
  const destinos: string[] = [];

  if (visivelParaResponsavel(ocorrencia)) destinos.push("responsável");
  if (visivelParaAluno(ocorrencia)) destinos.push("aluno");

  return destinos.length === 0 ? "Só a equipe" : `Visível: ${destinos.join(" e ")}`;
}
