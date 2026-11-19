import type { Alocacao, Matricula, Turma } from "@/core/modelo";

/**
 * Abrir o ano letivo seguinte.
 *
 * O colégio não apaga nada na virada: 2027 é um conjunto novo de turmas,
 * vínculos e matrículas, e 2026 fica inteiro onde está. Abrir o ano é
 * **copiar a estrutura** e, depois, **passar os alunos**.
 *
 * São duas coisas com riscos diferentes, e por isso não acontecem no
 * mesmo clique:
 *
 * - **a estrutura** (turmas, vínculos, critério) é segura e repetível:
 *   rodar duas vezes não duplica nada, e nada do ano anterior muda;
 * - **a passagem dos alunos** move gente de verdade. A partir dela o
 *   aluno pertence à turma nova, e é isso que a chamada e o diário
 *   passam a enxergar.
 *
 * Nenhuma das duas decide quem passa de ano. Aprovação é conclusão do
 * boletim; **promover é decisão da escola**, turma a turma, e o sistema
 * só pergunta para onde vai cada uma.
 */

/** Só o que distingue uma turma, para comparar entre anos. */
export type TurmaComId = Turma & { id: string };

/**
 * As turmas que faltam criar no ano novo.
 *
 * Compara por **código**, não por id: `EM1A` de 2026 e `EM1A` de 2027 são
 * a mesma turma do colégio em dois anos. Turma encerrada não atravessa —
 * se ela fechou, abrir de novo no ano seguinte seria ressuscitá-la sem
 * ninguém pedir.
 */
export function turmasParaCriar(
  doAnoBase: readonly TurmaComId[],
  jaNoAnoNovo: readonly TurmaComId[],
): TurmaComId[] {
  const existentes = new Set(jaNoAnoNovo.map((turma) => turma.codigo));

  return doAnoBase
    .filter((turma) => turma.ativa !== false && !existentes.has(turma.codigo))
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR"));
}

export type AlocacaoComId = Alocacao & { id: string };

/**
 * Os vínculos que faltam copiar.
 *
 * Um vínculo é professor × turma × disciplina. No ano novo ele aponta
 * para a turma nova, com o **mesmo código** — o professor que dava
 * Matemática na EM1A continua dando na EM1A do ano seguinte, até a
 * secretaria mudar.
 *
 * É uma sugestão, não uma verdade: o quadro do ano seguinte quase sempre
 * muda. Copiar e deixar corrigir é muito menos trabalho que montar
 * cento e dez vínculos do zero.
 */
export function vinculosParaCriar(
  doAnoBase: readonly AlocacaoComId[],
  jaNoAnoNovo: readonly AlocacaoComId[],
  codigoDaTurma: (turmaId: string) => string | null,
): Array<{ origem: AlocacaoComId; codigoDaTurma: string }> {
  const existentes = new Set(
    jaNoAnoNovo.map(
      (alocacao) => `${alocacao.turmaCodigo}|${alocacao.disciplinaId}`,
    ),
  );

  return doAnoBase
    .filter((alocacao) => alocacao.ativa !== false)
    .map((alocacao) => ({
      origem: alocacao,
      codigoDaTurma:
        alocacao.turmaCodigo ?? codigoDaTurma(alocacao.turmaId) ?? "",
    }))
    .filter(
      (item) =>
        item.codigoDaTurma !== "" &&
        !existentes.has(`${item.codigoDaTurma}|${item.origem.disciplinaId}`),
    );
}

/**
 * Quem passa de uma turma para o ano seguinte.
 *
 * Só quem está com a matrícula **ativa** naquela turma. Concluído,
 * transferido e cancelado ficam onde estão: eles não voltam no ano que
 * vem, e trazê-los junto criaria matrícula nova para quem saiu do
 * colégio.
 *
 * Quem já tem registro no ano novo é pulado, e não duplicado — passar a
 * mesma turma duas vezes não pode criar nada em dobro.
 */
export function alunosParaPassar(
  doAnoBase: readonly Matricula[],
  jaNoAnoNovo: readonly Matricula[],
  turmaDeOrigem: string,
): Matricula[] {
  const jaPassaram = new Set(
    jaNoAnoNovo.map((registro) => registro.matricula),
  );

  return doAnoBase
    .filter(
      (registro) =>
        registro.turmaId === turmaDeOrigem &&
        registro.situacao === "ativa" &&
        !jaPassaram.has(registro.matricula),
    )
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
