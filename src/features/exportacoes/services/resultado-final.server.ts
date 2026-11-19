import "server-only";

import type { SessionUser } from "@/core/auth/session";
import { contar, percentualDePresenca } from "@/core/escola/frequencia";
import { montarPlanilha, type Coluna } from "@/core/exportacao/planilha";
import { getAdminDb } from "@/core/firebase/admin";
import {
  COLECOES,
  idDoBoletimManual,
  ROTULOS_DE_SITUACAO,
  type Boletim,
  type BoletimManual,
  type Disciplina,
  type FrequenciaDiaria,
  type Matricula,
  type Nota,
  type SituacaoDePresenca,
  type Turma,
} from "@/core/modelo";
import { alunosDaTurmaNoAno } from "@/features/alunos/domain/matricula-do-ano";
import { listarAlunosVisiveis } from "@/features/alunos/services/alunos.server";
import { montarBoletim } from "@/features/notas/domain/boletim";
import {
  boletimQueVale,
  quadroQueVale,
} from "@/features/notas/domain/boletim-manual";
import { idDoBoletim } from "@/features/notas/services/notas.server";

/**
 * Ata de resultado final: as notas finais da turma, uma linha por aluno.
 *
 * **É por turma, e não poderia ser de outro jeito**: as colunas são as
 * disciplinas, e turmas diferentes têm grades diferentes. Uma planilha só
 * com todas as turmas teria uma coluna por disciplina do colégio inteiro e
 * um mar de células vazias.
 *
 * A ata mostra a **média final** de cada disciplina — a que decide — e, ao
 * lado, a situação. É o documento que a secretaria assina no fim do ano.
 *
 * **Ela segue o boletim oficial.** Quando um aluno tem boletim 2 marcado
 * como oficial, é dele que saem as médias, a frequência e a situação — o
 * documento que a família recebeu e a ata que a escola assina não podem
 * discordar. Decisão do colégio, e a coluna "Origem" aparece na planilha
 * para quem assina saber quais linhas foram digitadas à mão.
 */

interface LinhaDoResultado {
  sequencial: number;
  matricula: string;
  nome: string;
  /** disciplinaId → média final (ou anual, quando não houve recuperação). */
  medias: Record<string, number | null>;
  percentualDeFrequencia: number | null;
  situacao: string;
  /** A linha veio de um boletim 2 marcado como oficial? */
  doBoletimManual: boolean;
}

/**
 * Carrega a turma inteira de uma vez.
 *
 * `boletimDoAluno` resolve um aluno e faz cinco consultas; chamá-lo trinta
 * vezes numa exportação seriam cento e cinquenta idas ao banco. Aqui cada
 * coleção é lida uma vez e cruzada em memória, como no relatório
 * financeiro.
 */
export async function ataDeResultadoFinal(
  sessao: SessionUser,
  turmaId: string,
  anoLetivo: number,
): Promise<Buffer> {
  const db = getAdminDb();

  const [turmaDoc, alocacoes, disciplinasDocs, matriculasDoAno] = await Promise.all([
    db.collection(COLECOES.turmas).doc(turmaId).get(),
    db
      .collection(COLECOES.alocacoes)
      .where("turmaId", "==", turmaId)
      .where("anoLetivo", "==", anoLetivo)
      .get(),
    db.collection(COLECOES.disciplinas).get(),
    // Só o ano: duas igualdades pediriam índice composto, e a coleção
    // tem uma linha por aluno por ano — filtrar a turma em memória é de
    // graça.
    db
      .collection(COLECOES.matriculas)
      .where("anoLetivo", "==", anoLetivo)
      .get(),
  ]);

  const turma = turmaDoc.exists ? (turmaDoc.data() as Turma) : null;

  const ordens = new Map(
    disciplinasDocs.docs.map((doc) => [
      doc.id,
      (doc.data() as Disciplina).ordem ?? null,
    ]),
  );

  // A grade da turma vem das alocações: é ela que diz o que a turma cursa.
  const grade = [
    ...new Map(
      alocacoes.docs.map((doc) => {
        const dados = doc.data() as {
          disciplinaId: string;
          disciplinaNome?: string;
        };

        return [
          dados.disciplinaId,
          {
            disciplinaId: dados.disciplinaId,
            disciplinaNome: dados.disciplinaNome ?? dados.disciplinaId,
            ordem: ordens.get(dados.disciplinaId) ?? null,
          },
        ];
      }),
    ).values(),
  ].sort(
    (a, b) =>
      (a.ordem ?? Number.MAX_SAFE_INTEGER) -
        (b.ordem ?? Number.MAX_SAFE_INTEGER) ||
      a.disciplinaNome.localeCompare(b.disciplinaNome, "pt-BR"),
  );

  /*
    O escopo da sessão continua valendo: a ata é cópia de dado de aluno
    saindo do sistema, e o professor só exporta a turma dele.

    Quem estava na turma vem do **registro de matrícula daquele ano**, e
    não do cadastro — que guarda a turma de hoje. Sem isso, a ata de 2026
    tirada em 2027 sairia com os alunos de 2027. Ver
    `alunos/domain/matricula-do-ano.ts`.
  */
  const alunos = alunosDaTurmaNoAno(
    await listarAlunosVisiveis(sessao),
    matriculasDoAno.docs.map((doc) => doc.data() as Matricula),
    turmaId,
  ).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const matriculas = alunos.map((aluno) => aluno.matricula);

  const [notasDocs, boletinsDocs, manuaisDocs, frequenciaDocs] = await Promise.all([
    db
      .collection(COLECOES.notas)
      .where("turmaId", "==", turmaId)
      .where("anoLetivo", "==", anoLetivo)
      .get(),
    matriculas.length > 0
      ? db.getAll(
          ...matriculas.map((matricula) =>
            db
              .collection(COLECOES.boletins)
              .doc(idDoBoletim(anoLetivo, matricula)),
          ),
        )
      : Promise.resolve([]),
    matriculas.length > 0
      ? db.getAll(
          ...matriculas.map((matricula) =>
            db
              .collection(COLECOES.boletinsManuais)
              .doc(idDoBoletimManual(anoLetivo, matricula)),
          ),
        )
      : Promise.resolve([]),
    db
      .collection(COLECOES.frequenciaDiaria)
      .where("turmaId", "==", turmaId)
      .get(),
  ]);

  const notasPorAluno = agrupar(
    notasDocs.docs.map((doc) => doc.data() as Nota),
    (nota) => nota.matricula,
  );

  const presencasPorAluno = agrupar(
    frequenciaDocs.docs.map((doc) => doc.data() as FrequenciaDiaria),
    (registro) => registro.matricula,
  );

  const boletinsPorAluno = new Map(
    boletinsDocs
      .filter((doc) => doc.exists)
      .map((doc) => {
        const boletim = doc.data() as Boletim;
        return [boletim.matricula, boletim] as const;
      }),
  );

  const manuaisPorAluno = new Map(
    manuaisDocs
      .filter((doc) => doc.exists)
      .map((doc) => {
        const manual = doc.data() as BoletimManual;
        return [manual.matricula, manual] as const;
      }),
  );

  const linhas: LinhaDoResultado[] = alunos.map((aluno, indice) => {
    const boletim = boletinsPorAluno.get(aluno.matricula) ?? null;
    const manual = manuaisPorAluno.get(aluno.matricula) ?? null;

    const percentualDeFrequencia = percentualDePresenca(
      contar(
        (presencasPorAluno.get(aluno.matricula) ?? []).map(
          (registro) => registro.situacao as SituacaoDePresenca,
        ),
      ),
    );

    const montado = montarBoletim({
      notas: notasPorAluno.get(aluno.matricula) ?? [],
      recuperacoes: boletim?.recuperacoes ?? {},
      dependencias: boletim?.dependencias ?? [],
      percentualDeFrequencia,
      grade,
    });

    /*
      O boletim 2 oficial manda na ata inteira da linha: médias,
      frequência e situação. Misturar — média de um, situação de outro —
      produziria uma linha que não existe em documento nenhum.

      As colunas continuam vindo da grade da turma. Uma disciplina que
      esteja no boletim 2 e já não esteja na grade não ganha coluna, e
      uma que esteja na grade e não no boletim 2 sai vazia.
    */
    const oficial = boletimQueVale(manual);

    // `quadroQueVale` é a **mesma** função que a tela do boletim, o Portal
    // da família e a impressão usam. Repetir a escolha aqui seria uma
    // segunda versão dela, e é entre a ata e o boletim que divergir dói
    // mais: os dois saem assinados.
    const fonte = quadroQueVale({
      oficial,
      manual,
      disciplinas: montado.disciplinas,
      faltasPorTrimestre: montado.faltasPorTrimestre,
      percentualDeFrequencia,
      situacao: montado.situacao,
    });

    return {
      sequencial: indice + 1,
      matricula: aluno.matricula,
      nome: aluno.nome,
      medias: Object.fromEntries(
        fonte.disciplinas.map((linha) => [
          linha.disciplinaId,
          // A final é a que decide; sem recuperação ela não existe, e aí a
          // anual é o resultado. Mostrar vazio esconderia a nota do aluno
          // aprovado direto, que é a maioria.
          linha.mediaFinal ?? linha.mediaAnual,
        ]),
      ),
      percentualDeFrequencia: fonte.percentualDeFrequencia,
      situacao: ROTULOS_DE_SITUACAO[fonte.situacao],
      doBoletimManual: oficial === "manual",
    };
  });

  const colunas: Coluna<LinhaDoResultado>[] = [
    { titulo: "Nº", tipo: "numero", largura: 6, valor: (l) => l.sequencial },
    { titulo: "Matrícula", tipo: "texto", largura: 12, valor: (l) => l.matricula },
    { titulo: "Aluno", tipo: "texto", largura: 38, valor: (l) => l.nome },

    ...grade.map(
      (disciplina): Coluna<LinhaDoResultado> => ({
        titulo: disciplina.disciplinaNome,
        tipo: "numero",
        largura: 14,
        valor: (l) => l.medias[disciplina.disciplinaId] ?? null,
      }),
    ),

    {
      titulo: "Frequência",
      tipo: "texto",
      largura: 12,
      valor: (l) =>
        l.percentualDeFrequencia === null
          ? null
          : `${Math.round(l.percentualDeFrequencia * 100)}%`,
    },
    { titulo: "Situação", tipo: "texto", largura: 22, valor: (l) => l.situacao },

    /*
      A coluna só existe quando alguma linha veio de um boletim 2. Numa
      turma em que ninguém tem, ela seria uma coluna vazia em toda ata —
      e quem assina pararia de olhar para ela justamente no dia em que
      ela tivesse conteúdo.
    */
    ...(linhas.some((linha) => linha.doBoletimManual)
      ? [
          {
            titulo: "Origem",
            tipo: "texto" as const,
            largura: 22,
            valor: (l: LinhaDoResultado) =>
              l.doBoletimManual ? "Boletim 2 (secretaria)" : "Calculado",
          },
        ]
      : []),
  ];

  return montarPlanilha({
    // O nome da aba leva o código da turma: a secretaria exporta uma por
    // uma e junta os arquivos, e abas chamadas "Planilha1" não dizem qual
    // é qual.
    aba: `Resultado ${turma?.codigo ?? turmaId}`.slice(0, 31),
    colunas,
    linhas,
  });
}

function agrupar<T>(itens: T[], chave: (item: T) => string): Map<string, T[]> {
  const grupos = new Map<string, T[]>();

  for (const item of itens) {
    const id = chave(item);
    grupos.set(id, [...(grupos.get(id) ?? []), item]);
  }

  return grupos;
}
