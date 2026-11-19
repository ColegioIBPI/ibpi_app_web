import type { Aluno, Matricula } from "@/core/modelo";
import { anoDeEntrada } from "@/features/alunos/domain/nova-matricula";

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

/** O mínimo que a listagem precisa do cadastro para virar lista do ano. */
export interface AlunoDaLista {
  matricula: string;
  turmaId?: string | null;
  turmaCodigo?: string | null;
  serie?: string | null;
  turno?: Aluno["turno"] | null;
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
    Pick<Matricula, "matricula" | "turmaId" | "turmaCodigo" | "serie" | "turno">
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
      resultado.push({ ...aluno, ...turmaDoAno(registro, aluno) });
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
