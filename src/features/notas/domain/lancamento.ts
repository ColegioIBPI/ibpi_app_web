import type { AvaliacoesDoTrimestre, Nota, Trimestre } from "@/core/modelo";

/**
 * Montagem da tela de lançamento de notas.
 *
 * O professor abre uma turma e uma disciplina num trimestre e digita as três
 * avaliações de cada aluno. A tela carrega a turma inteira, com o que já foi
 * lançado — refazer o lançamento corrige o registro em vez de criar um
 * segundo.
 */

export const AVALIACOES = ["projeto", "tarefas", "av"] as const;

export type CampoDeAvaliacao = (typeof AVALIACOES)[number];

export const ROTULOS_DE_AVALIACAO: Record<CampoDeAvaliacao, string> = {
  projeto: "Projeto",
  tarefas: "Tarefas",
  av: "AV",
};

/** Id determinístico: um lançamento por aluno, disciplina e trimestre. */
export function idDaNota(
  anoLetivo: number,
  trimestre: Trimestre,
  matricula: string,
  disciplinaId: string,
): string {
  return `${anoLetivo}-t${trimestre}-${matricula}-${disciplinaId}`;
}

export interface AlunoParaLancar {
  matricula: string;
  nome: string;
}

export interface LinhaDeLancamento {
  matricula: string;
  nome: string;
  /** Texto digitado, não número: a tela guarda o que a pessoa escreveu. */
  avaliacoes: Record<CampoDeAvaliacao, string>;
  faltas: number;
  jaLancado: boolean;
}

/**
 * Converte o que foi digitado em nota.
 *
 * Aceita vírgula decimal, que é como se escreve nota no Brasil — exigir
 * ponto faria o professor errar a cada linha.
 *
 * Devolve `{ valor: null }` para campo vazio (nota ainda não lançada) e
 * `{ erro }` para o que não é nota válida. Os dois casos são diferentes:
 * vazio é legítimo, "abc" é engano.
 */
export function paraNota(texto: string): { valor: number | null; erro?: string } {
  const limpo = texto.trim().replace(",", ".");
  if (limpo === "") return { valor: null };

  const numero = Number(limpo);

  if (!Number.isFinite(numero)) {
    return { valor: null, erro: `"${texto.trim()}" não é uma nota.` };
  }

  if (numero < 0 || numero > 10) {
    return { valor: null, erro: "A nota vai de 0 a 10." };
  }

  return { valor: numero };
}

/** Nota → texto do campo, com vírgula decimal. */
export function paraTexto(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "";

  return String(valor).replace(".", ",");
}

/** A turma inteira, com o que já estiver lançado. */
export function montarLancamento(
  alunos: readonly AlunoParaLancar[],
  notas: readonly Nota[],
): LinhaDeLancamento[] {
  const porMatricula = new Map(notas.map((nota) => [nota.matricula, nota]));

  return alunos.map((aluno) => {
    const nota = porMatricula.get(aluno.matricula);

    return {
      matricula: aluno.matricula,
      nome: aluno.nome,
      avaliacoes: {
        projeto: paraTexto(nota?.avaliacoes?.projeto),
        tarefas: paraTexto(nota?.avaliacoes?.tarefas),
        av: paraTexto(nota?.avaliacoes?.av),
      },
      faltas: nota?.faltas ?? 0,
      jaLancado: Boolean(nota),
    };
  });
}

export interface LinhaValidada {
  matricula: string;
  avaliacoes: AvaliacoesDoTrimestre;
  faltas: number;
}

export interface ResultadoDaValidacao {
  linhas: LinhaValidada[];
  erros: Record<string, string>;
}

/**
 * Valida o que foi digitado, linha por linha.
 *
 * O erro fica preso à matrícula para a tela apontar a linha certa. Um
 * "nota inválida" genérico no topo de uma turma de 30 alunos obriga a
 * conferir tudo de novo.
 */
export function validarLancamento(
  linhas: readonly LinhaDeLancamento[],
): ResultadoDaValidacao {
  const validadas: LinhaValidada[] = [];
  const erros: Record<string, string> = {};

  for (const linha of linhas) {
    const avaliacoes: Record<string, number | null> = {};

    for (const campo of AVALIACOES) {
      const { valor, erro } = paraNota(linha.avaliacoes[campo]);

      if (erro) {
        erros[linha.matricula] = `${ROTULOS_DE_AVALIACAO[campo]}: ${erro}`;
        break;
      }

      avaliacoes[campo] = valor;
    }

    if (erros[linha.matricula]) continue;

    validadas.push({
      matricula: linha.matricula,
      avaliacoes: avaliacoes as unknown as AvaliacoesDoTrimestre,
      faltas: linha.faltas,
    });
  }

  return { linhas: validadas, erros };
}

/**
 * Só o que mudou.
 *
 * Gravar a turma inteira a cada salvamento encheria a auditoria de
 * "7,0 → 7,0" e esconderia a correção que de fato aconteceu — que é
 * exatamente o registro que o colégio precisa quando uma família contesta
 * uma nota.
 */
export function linhasParaGravar(
  atuais: readonly LinhaDeLancamento[],
  originais: readonly LinhaDeLancamento[],
): LinhaDeLancamento[] {
  const porMatricula = new Map(
    originais.map((linha) => [linha.matricula, linha]),
  );

  return atuais.filter((linha) => {
    const original = porMatricula.get(linha.matricula);

    if (!original) return temAlgumaNota(linha);

    const mudouNota = AVALIACOES.some(
      (campo) =>
        normalizar(linha.avaliacoes[campo]) !==
        normalizar(original.avaliacoes[campo]),
    );

    return mudouNota || linha.faltas !== original.faltas;
  });
}

function temAlgumaNota(linha: LinhaDeLancamento): boolean {
  return (
    AVALIACOES.some((campo) => linha.avaliacoes[campo].trim() !== "") ||
    linha.faltas > 0
  );
}

/**
 * "7,0", "7.0" e " 7 " são a mesma nota digitada.
 *
 * Texto que não é nota volta como está, e não como vazio: senão um "11"
 * digitado por engano seria tratado como "campo em branco", a linha sairia
 * da lista de alterações e o professor salvaria sem gravar nada e sem
 * receber aviso nenhum.
 */
function normalizar(texto: string): string {
  const { valor, erro } = paraNota(texto);

  if (erro) return texto.trim();

  return valor === null ? "" : String(valor);
}
