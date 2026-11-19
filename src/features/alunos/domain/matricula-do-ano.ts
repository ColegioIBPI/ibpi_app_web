import type { Aluno, Matricula, SituacaoDaMatricula } from "@/core/modelo";
import { anoDeEntrada } from "@/features/alunos/domain/nova-matricula";
import {
  dataDoStatus,
  ehMatriculaAtiva,
} from "@/features/alunos/domain/situacao";

/**
 * Em que turma o aluno estava **naquele ano**.
 *
 * O cadastro do aluno tem uma turma só, e ela é a de **hoje**: trocá-la na
 * virada do ano é o certo, e é exatamente o que apagaria o passado se o
 * resto do sistema a usasse para tudo.
 *
 * O boletim de 2026 monta a grade a partir das alocações daquela turma
 * naquele ano. Depois da virada, perguntar ao cadastro devolveria a turma
 * de 2027 — e as alocações de 2027 não existem em 2026. O boletim sairia
 * **sem nenhuma coluna**, sem erro nenhum na tela: o histórico some e
 * ninguém percebe até a família pedir a segunda via.
 *
 * Quem sabe a resposta é `matriculas/{ano}-{matrícula}`, que já guarda
 * turma, série, turno e situação por ano letivo.
 */

export interface TurmaDoAno {
  turmaId: string | null;
  turmaCodigo: string | null;
  serie: string | null;
  turno: Aluno["turno"] | null;
}

export function idDaMatriculaDoAno(
  anoLetivo: number,
  matricula: string,
): string {
  return `${anoLetivo}-${matricula}`;
}

/**
 * O registro do ano manda; sem ele, vale o cadastro.
 *
 * A queda para o cadastro cobre dois casos reais: o **ano em curso**, em
 * que a secretaria pode ter criado o aluno sem gerar o registro de
 * matrícula, e o aluno migrado do Access antes de a coleção existir.
 *
 * Para um ano que o colégio não cursou ela não acerta nada — mas também
 * não estraga: sem alocações daquele ano a grade sai vazia de qualquer
 * forma, e é o resultado correto.
 */
export function turmaDoAno(
  doAno: Pick<Matricula, "turmaId" | "turmaCodigo" | "serie" | "turno"> | null,
  cadastro: {
    turmaId?: string | null;
    turmaCodigo?: string | null;
    serie?: string | null;
    turno?: Aluno["turno"] | null;
  },
): TurmaDoAno {
  if (doAno) {
    return {
      turmaId: doAno.turmaId || null,
      turmaCodigo: doAno.turmaCodigo || null,
      serie: doAno.serie || null,
      turno: doAno.turno ?? null,
    };
  }

  return {
    turmaId: cadastro.turmaId ?? null,
    turmaCodigo: cadastro.turmaCodigo ?? null,
    serie: cadastro.serie ?? null,
    turno: cadastro.turno ?? null,
  };
}

/**
 * Quem estava **naquela turma, naquele ano**.
 *
 * A ata de resultado final tem o mesmo problema do boletim, e pior: ela é
 * o documento que a escola assina no fim do ano. Filtrar pelo cadastro
 * traria, depois da virada, a turma de hoje — a ata de 2026 sairia com os
 * alunos de 2027.
 *
 * A decisão é por **ano inteiro**, não por turma: se o ano tem registro
 * de matrícula, ele manda em tudo, e uma turma sem ninguém nele é uma
 * turma que ninguém cursou. Perguntar turma a turma faria o cadastro
 * voltar a responder justamente onde o registro do ano diz "vazio".
 */
export function alunosDaTurmaNoAno<
  T extends { matricula: string; turmaId?: string | null },
>(
  alunos: readonly T[],
  matriculasDoAno: ReadonlyArray<Pick<Matricula, "matricula" | "turmaId">>,
  turmaId: string,
): T[] {
  if (matriculasDoAno.length === 0) {
    // Ano sem registro nenhum: o cadastro é tudo o que há. É o estado de
    // hoje para quem foi criado no portal, e o do ano em curso.
    return alunos.filter((aluno) => aluno.turmaId === turmaId);
  }

  const naTurma = new Set(
    matriculasDoAno
      .filter((registro) => registro.turmaId === turmaId)
      .map((registro) => registro.matricula),
  );

  return alunos.filter((aluno) => naTurma.has(aluno.matricula));
}

export interface SituacaoDoAno {
  situacaoMatricula: SituacaoDaMatricula;
  dataDaSituacao: string | null;
  /** Derivado da situação, nunca guardado solto — ver `domain/situacao.ts`. */
  ativo: boolean;
}

/**
 * A situação da matrícula **naquele ano**.
 *
 * O cadastro guarda uma situação só, e ela é a de hoje. O aluno que
 * concluiu o Ensino Médio em 2026 está `concluida` desde dezembro — e,
 * se a ata de 2026 perguntasse ao cadastro, ela sairia com todo mundo
 * concluído, inclusive quem ainda estava cursando em março.
 *
 * Pior no sentido contrário: o aluno que cancelou em 2027 apareceria
 * como cancelado na ata de 2026, um ano em que ele estudou inteiro.
 *
 * Quem responde é o registro do ano. A queda para o cadastro cobre o ano
 * em curso antes de existir registro, e o aluno migrado do Access.
 */
export function situacaoDoAno(
  doAno: Pick<Matricula, "situacao" | "dataDaSituacao"> | null,
  cadastro: {
    situacaoMatricula?: SituacaoDaMatricula;
    dataDaSituacao?: string | null;
  },
): SituacaoDoAno {
  const situacaoMatricula =
    doAno?.situacao ?? cadastro.situacaoMatricula ?? "ativa";

  return {
    situacaoMatricula,
    dataDaSituacao: doAno
      ? (doAno.dataDaSituacao ?? null)
      : (cadastro.dataDaSituacao ?? null),
    ativo: ehMatriculaAtiva(situacaoMatricula),
  };
}

export interface SituacaoParaOAno {
  situacaoMatricula: SituacaoDaMatricula;
  dataDaSituacao: string | null;
}

/**
 * O que o registro do ano guarda de situação, na hora de gravar.
 *
 * Uma função só, porque são **três caminhos de gravação**: a situação em
 * lote, a ficha do aluno quando só a situação muda, e a ficha quando a
 * troca de turma refaz o registro inteiro. Três cópias seriam três
 * regras, e um dia uma delas guardaria a data em matrícula ativa
 * enquanto as outras guardariam `null`.
 *
 * A data é a de **encerramento**, e por isso é `null` para quem está
 * ativo: no cadastro esse campo vira a data de matrícula, que aqui não
 * significa nada — o registro já é do ano.
 */
export function camposDaSituacao(situacao: SituacaoParaOAno): {
  situacao: SituacaoDaMatricula;
  dataDaSituacao: string | null;
} {
  return {
    situacao: situacao.situacaoMatricula,
    dataDaSituacao: dataDoStatus(situacao),
  };
}

/** O mínimo que a listagem precisa do cadastro para virar lista do ano. */
export interface AlunoDaLista {
  matricula: string;
  turmaId?: string | null;
  turmaCodigo?: string | null;
  serie?: string | null;
  turno?: Aluno["turno"] | null;
  situacaoMatricula?: SituacaoDaMatricula;
  dataDaSituacao?: string | null;
}

export interface ListaDoAno<T> {
  /** Quem cursou o ano, já com a turma, a série e o turno **daquele ano**. */
  alunos: T[];
  /** Quantos ficaram de fora. Zero na maioria dos anos. */
  foraDoAno: number;
}

/**
 * A lista de alunos de um ano letivo.
 *
 * A pergunta "quais são os alunos?" não tem resposta sem um ano junto. O
 * cadastro guarda a turma de **hoje**; quem sabe quem cursou 2026, e em
 * que turma, é `matriculas/2026-{matrícula}`. Sem isto a lista de 2027
 * sairia com os 73 alunos de 2026 ainda nas turmas de 2026 — a tela
 * diria 2027 e mostraria o ano anterior.
 *
 * Vale para a **situação** também: cada aluno sai daqui com a turma, a
 * série, o turno, a situação e a data **daquele ano**, e com `ativo`
 * derivado dela. É o que faz a ata de 2026 trazer quem estava ativo em
 * 2026, e não quem está ativo hoje.
 *
 * Pertence ao ano quem tem registro nele. Mais uma exceção estreita: o
 * aluno **recém-cadastrado sem turma**, que não tem registro em ano
 * nenhum, aparece no ano em que entrou. Sem ela, a secretaria cadastraria
 * um aluno e ele sumiria da lista no mesmo instante — e o jeito de
 * resolver seria cadastrá-lo de novo.
 *
 * Quem sobra sai em `foraDoAno`, para a tela dizer que escondeu alguém.
 * Lista que encolhe calada é a que faz a secretaria duvidar do sistema.
 */
export function alunosDoAno<T extends AlunoDaLista>(
  alunos: readonly T[],
  matriculasDoAno: ReadonlyArray<
    Pick<
      Matricula,
      | "matricula"
      | "turmaId"
      | "turmaCodigo"
      | "serie"
      | "turno"
      | "situacao"
      | "dataDaSituacao"
    >
  >,
  anoLetivo: number,
): ListaDoAno<T> {
  const doAno = new Map(
    matriculasDoAno.map((registro) => [registro.matricula, registro]),
  );

  const resultado: T[] = [];
  let foraDoAno = 0;

  for (const aluno of alunos) {
    const registro = doAno.get(aluno.matricula);

    if (registro) {
      resultado.push({
        ...aluno,
        ...turmaDoAno(registro, aluno),
        ...situacaoDoAno(registro, aluno),
      });
      continue;
    }

    /*
      Não precisa olhar os outros anos: ter registro naquele ano já foi
      perguntado acima, e passar para o ano seguinte exige ter registro
      no anterior. Quem entrou no ano e não tem registro nele não tem
      registro em lugar nenhum.
    */
    if (anoDeEntrada(aluno.matricula) === anoLetivo) {
      resultado.push(aluno);
      continue;
    }

    foraDoAno += 1;
  }

  return { alunos: resultado, foraDoAno };
}
