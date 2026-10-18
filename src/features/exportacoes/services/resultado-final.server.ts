import "server-only";

import type { SessionUser } from "@/core/auth/session";
import { contar, percentualDePresenca } from "@/core/escola/frequencia";
import { montarPlanilha, type Coluna } from "@/core/exportacao/planilha";
import { getAdminDb } from "@/core/firebase/admin";
import {
  COLECOES,
  ROTULOS_DE_SITUACAO,
  type Boletim,
  type Disciplina,
  type FrequenciaDiaria,
  type Nota,
  type SituacaoDePresenca,
  type Turma,
} from "@/core/modelo";
import { listarAlunosVisiveis } from "@/features/alunos/services/alunos.server";
import { montarBoletim } from "@/features/notas/domain/boletim";
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
 */

interface LinhaDoResultado {
  sequencial: number;
  matricula: string;
  nome: string;
  /** disciplinaId → média final (ou anual, quando não houve recuperação). */
  medias: Record<string, number | null>;
  percentualDeFrequencia: number | null;
  situacao: string;
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

  const [turmaDoc, alocacoes, disciplinasDocs] = await Promise.all([
    db.collection(COLECOES.turmas).doc(turmaId).get(),
    db
      .collection(COLECOES.alocacoes)
      .where("turmaId", "==", turmaId)
      .where("anoLetivo", "==", anoLetivo)
      .get(),
    db.collection(COLECOES.disciplinas).get(),
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

  // O escopo da sessão continua valendo: a ata é cópia de dado de aluno
  // saindo do sistema, e o professor só exporta a turma dele.
  const alunos = (await listarAlunosVisiveis(sessao))
    .filter((aluno) => aluno.turmaId === turmaId)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const matriculas = alunos.map((aluno) => aluno.matricula);

  const [notasDocs, boletinsDocs, frequenciaDocs] = await Promise.all([
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

  const linhas: LinhaDoResultado[] = alunos.map((aluno, indice) => {
    const boletim = boletinsPorAluno.get(aluno.matricula) ?? null;

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

    return {
      sequencial: indice + 1,
      matricula: aluno.matricula,
      nome: aluno.nome,
      medias: Object.fromEntries(
        montado.disciplinas.map((linha) => [
          linha.disciplinaId,
          // A final é a que decide; sem recuperação ela não existe, e aí a
          // anual é o resultado. Mostrar vazio esconderia a nota do aluno
          // aprovado direto, que é a maioria.
          linha.mediaFinal ?? linha.mediaAnual,
        ]),
      ),
      percentualDeFrequencia,
      situacao: ROTULOS_DE_SITUACAO[montado.situacao],
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
