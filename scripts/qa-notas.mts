/**
 * Notas e diários de classe para o QA.
 *
 *   npm run qa:notas
 *   npm run qa:notas -- --apagar
 *
 * Sem nota lançada, o boletim, a ata de resultado final e o gráfico de
 * médias abrem em branco, e o QA não tem o que conferir. Sem diário, a
 * pauta sai sem colunas de aula e a frequência por disciplina não calcula.
 *
 * ## Isto grava em aluno real. Por que é seguro
 *
 * As notas nascem **sem `liberado`**, e aí duas coisas valem ao mesmo
 * tempo: o serviço do Portal recorta antes de montar o boletim, e a
 * Security Rule nega a nota crua ao aplicativo. **Nenhuma família vê nada
 * disto** até alguém liberar o trimestre em Gestão › Boletins — que é
 * justamente o teste 4.2 do guia.
 *
 * Cada nota leva `observacoes` dizendo que é semente de QA, e os ids são
 * determinísticos, então o `--apagar` leva exatamente o que foi semeado.
 *
 * > Depois do QA, rode `--apagar`. Nota de mentira esquecida no cadastro é
 * > a que reaparece no boletim do ano seguinte.
 *
 * ## O que é semeado
 *
 * Só nas turmas do **Professor de Teste** (EM2A e EM3A) — é a conta que o
 * QA usa, e espalhar nota por dez turmas só multiplicaria o que há para
 * apagar depois.
 *
 * Os alunos recebem **resultados diferentes de propósito**, porque é a
 * variedade que testa o cálculo:
 *
 * | Caso | O que exercita |
 * | --- | --- |
 * | três trimestres cheios, médias altas | aprovado direto |
 * | médias baixas, sem recuperação | "Em recuperação" |
 * | médias baixas, recuperação 7,0 | aprovado pela **média final** |
 * | médias baixas, recuperação 3,0 | reprovado |
 * | AV do 3º em branco | **nota ausente não é zero** — a média fica vazia |
 * | zero lançado | zero **é** nota e entra na conta |
 * | muitas faltas | reprovado por falta |
 */
import { getAdminDb } from "@/core/firebase/admin";
import { idDoDiario } from "@/core/escola/aulas";
import { COLECOES, type Alocacao, type Aluno } from "@/core/modelo";
import { idDaNota } from "@/features/notas/domain/lancamento";

const ANO = 2026;
const TURMAS = ["2026-EM2A", "2026-EM3A"];
const MARCA = "Semente de QA — apagar com npm run qa:notas -- --apagar";

const db = getAdminDb();
const apagando = process.argv.includes("--apagar");

/** Os perfis de resultado, aplicados ciclicamente sobre a turma. */
/**
 * `recuperacao` é a nota da prova final, quando houver.
 *
 * Três perfis de nota baixa, e a diferença entre eles é só essa nota — é o
 * que separa os três estados que o boletim pode mostrar no fim do ano:
 *
 * - **sem** recuperação lançada → "Em recuperação", esperando a prova;
 * - **com** 7,0 → aprovado pela média final `(anual + rec) ÷ 2`;
 * - **com** 3,0 → reprovado mesmo depois da prova.
 */
const PERFIS = [
  { nome: "aprovado", notas: [8.5, 9, 8], faltas: 2, recuperacao: null },
  { nome: "mediano", notas: [6.5, 7, 6], faltas: 4, recuperacao: null },
  { nome: "em recuperação", notas: [4.5, 5, 4], faltas: 3, recuperacao: null },
  { nome: "recuperado", notas: [4, 4.5, 3.5], faltas: 3, recuperacao: 7 },
  { nome: "reprovado", notas: [3, 3.5, 2.5], faltas: 6, recuperacao: 3 },
  { nome: "com zero", notas: [0, 7, 8], faltas: 1, recuperacao: null },
  { nome: "trimestre aberto", notas: [7, 7.5, null], faltas: 2, recuperacao: null },
  { nome: "muita falta", notas: [7, 7, 7], faltas: 30, recuperacao: null },
] as const;

async function criar() {
  const alocacoes = (await db.collection(COLECOES.alocacoes).get()).docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Alocacao) }))
    .filter((a) => a.anoLetivo === ANO && TURMAS.includes(a.turmaId));

  if (alocacoes.length === 0) {
    console.error(
      "\n  Nenhuma alocação nas turmas do professor de teste.\n" +
        "  Rode antes: npm run qa:vinculos\n",
    );
    process.exit(1);
  }

  const alunos = (await db.collection(COLECOES.alunos).get()).docs
    .map((doc) => ({ ...(doc.data() as Aluno), matricula: doc.id }))
    .filter((a) => a.ativo && TURMAS.includes(a.turmaId ?? ""))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  /**
   * O perfil é escolhido **uma vez por aluno**, aqui.
   *
   * Antes cada função o recalculava pelo próprio índice — um pela posição
   * na turma, outro pela posição na lista geral —, e aí a recuperação caía
   * num aluno e a nota baixa em outro. O caso "reprovado" nunca chegava a
   * existir.
   */
  const perfilDoAluno = new Map<string, (typeof PERFIS)[number]>();
  for (const turma of TURMAS) {
    const daTurma = alunos.filter((a) => a.turmaId === turma);
    for (const [indice, aluno] of daTurma.entries()) {
      perfilDoAluno.set(aluno.matricula, PERFIS[indice % PERFIS.length]);
    }
  }

  let notas = 0;
  let lote = db.batch();
  let noLote = 0;

  async function talvezCommit() {
    if (++noLote >= 400) {
      await lote.commit();
      lote = db.batch();
      noLote = 0;
    }
  }

  for (const alocacao of alocacoes) {
    const daTurma = alunos.filter((a) => a.turmaId === alocacao.turmaId);

    for (const aluno of daTurma) {
      const perfil = perfilDoAluno.get(aluno.matricula)!;

      for (const trimestre of [1, 2, 3] as const) {
        const base = perfil.notas[trimestre - 1];

        lote.set(
          db
            .collection(COLECOES.notas)
            .doc(
              idDaNota(ANO, trimestre, aluno.matricula, alocacao.disciplinaId),
            ),
          {
            anoLetivo: ANO,
            trimestre,
            matricula: aluno.matricula,
            nome: aluno.nome,
            turmaId: alocacao.turmaId,
            turmaCodigo: alocacao.turmaCodigo ?? null,
            disciplinaId: alocacao.disciplinaId,
            disciplinaNome: alocacao.disciplinaNome ?? alocacao.disciplinaId,
            avaliacoes: avaliacoesDe(base),
            faltas: Math.round(perfil.faltas / 3),
            observacoes: MARCA,
            lancadoPor: alocacao.professorId,
            // **Sem `liberado`**: é o que mantém tudo isto longe da família
            // até alguém liberar o trimestre em Gestão › Boletins.
            origem: "portal",
          },
          { merge: true },
        );

        notas += 1;
        await talvezCommit();
      }
    }
  }

  if (noLote > 0) await lote.commit();

  const diarios = await criarDiarios(alocacoes, alunos);
  const chamadas = await criarFrequencia(alunos, perfilDoAluno);
  const recuperacoes = await criarRecuperacoes(alocacoes, alunos, perfilDoAluno);

  console.log(`
  ${notas} nota(s) em ${alocacoes.length} alocação(ões), ${alunos.length} aluno(s).
  ${diarios} diário(s) de classe, com conteúdo e chamada.
  ${chamadas} lançamento(s) de frequência diária, em 20 dias letivos.
  ${recuperacoes} recuperação(ões) final(is), para o cálculo de média final.

  Turmas: ${TURMAS.join(", ")}

  Resultados variados de propósito: aprovado, em recuperação, reprovado
  (com a recuperação lançada), trimestre em aberto, zero lançado e
  reprovado por falta.

  NADA DISTO CHEGA À FAMÍLIA até o trimestre ser liberado em
  Gestão › Boletins — que é o teste 4.2 do guia.

  Para remover:  npm run qa:notas -- --apagar
`);
}

/** `null` vira as três avaliações vazias — média em branco, não zero. */
function avaliacoesDe(base: number | null) {
  if (base === null) return { projeto: null, tarefas: null, av: null };

  // Pequena variação entre as três, para a média não sair redonda demais e
  // o arredondamento de duas casas ter o que exercitar.
  return {
    projeto: arredondar(base + 0.3),
    tarefas: arredondar(base + 0.7),
    av: arredondar(base - 0.4),
  };
}

function arredondar(valor: number): number {
  return Math.max(0, Math.min(10, Math.round(valor * 100) / 100));
}

/**
 * Um diário por alocação no 3º trimestre.
 *
 * Só um trimestre: três por alocação dariam 66 diários e nada a mais para
 * testar. O 3º porque é o corrente.
 */
async function criarDiarios(
  alocacoes: Array<Alocacao & { id: string }>,
  alunos: Array<{ matricula: string; turmaId?: string | null }>,
): Promise<number> {
  const AULAS: Array<{
    numero: number;
    data: string;
    conteudo: string | null;
    semAula: string | null;
  }> = [
    { numero: 1, data: "2026-08-04", conteudo: "Apresentação do trimestre", semAula: null },
    { numero: 2, data: "2026-08-11", conteudo: "Função do 1º grau", semAula: null },
    { numero: 3, data: "2026-08-18", conteudo: "Exercícios em sala", semAula: null },
    // Dia sem aula: entra na pauta com o motivo e **não** conta falta.
    { numero: 4, data: "2026-09-07", conteudo: null, semAula: "feriado" },
    { numero: 5, data: "2026-09-15", conteudo: "Revisão para a avaliação", semAula: null },
    { numero: 6, data: "2026-09-22", conteudo: "Avaliação do trimestre", semAula: null },
  ];

  let lote = db.batch();
  let criados = 0;

  for (const alocacao of alocacoes) {
    const daTurma = alunos.filter((a) => a.turmaId === alocacao.turmaId);

    const aulas = AULAS.map((aula) => ({
      ...aula,
      presencas: aula.semAula
        ? {}
        : Object.fromEntries(
            daTurma.map((aluno, indice) => [
              aluno.matricula,
              // Uma falta a cada cinco alunos, variando por aula: dá
              // percentuais diferentes sem ninguém reprovar por isto.
              (indice + aula.numero) % 5 !== 0,
            ]),
          ),
    }));

    lote.set(
      db.collection(COLECOES.diarioClasse).doc(idDoDiario(alocacao.id, 3)),
      {
        anoLetivo: ANO,
        trimestre: 3,
        alocacaoId: alocacao.id,
        professorId: alocacao.professorId,
        professorNome: alocacao.professorNome ?? null,
        turmaId: alocacao.turmaId,
        turmaCodigo: alocacao.turmaCodigo ?? null,
        disciplinaId: alocacao.disciplinaId,
        disciplinaNome: alocacao.disciplinaNome ?? alocacao.disciplinaId,
        aulas,
        avaliacoesDeTrabalho: [],
        origem: "portal",
      },
      { merge: true },
    );

    criados += 1;

    if (criados % 400 === 0) {
      await lote.commit();
      lote = db.batch();
    }
  }

  await lote.commit();

  return criados;
}

/**
 * Frequência diária — a chamada da secretaria.
 *
 * É diferente do diário: o diário conta **aulas** de uma disciplina, e
 * isto conta **dias**. É daqui que sai o percentual que reprova por falta,
 * e sem ele o boletim nunca mostra "Reprovado por falta".
 *
 * Inclui as quatro marcações, inclusive a **saída antecipada**, que é a
 * mais nova e a que o QA precisa ver contando como presença.
 */
async function criarFrequencia(
  alunos: Array<{ matricula: string; nome: string; turmaId?: string | null; turmaCodigo?: string | null }>,
  perfilDoAluno: Map<string, (typeof PERFIS)[number]>,
): Promise<number> {
  const DIAS = Array.from({ length: 20 }, (_, i) => {
    const dia = new Date(Date.UTC(ANO, 7, 3 + i * 3));
    return dia.toISOString().slice(0, 10);
  });

  let lote = db.batch();
  let gravados = 0;

  for (const [indiceAluno, aluno] of alunos.entries()) {
    // O perfil "muita falta" leva 30 faltas e é o único que reprova por
    // frequência — o resto fica confortavelmente acima dos 75%.
    const faltaMuito = perfilDoAluno.get(aluno.matricula)?.nome === "muita falta";

    for (const [indiceDia, data] of DIAS.entries()) {
      const situacao = faltaMuito
        ? indiceDia % 4 === 0
          ? "presente"
          : "falta"
        : escolherSituacao(indiceAluno + indiceDia);

      lote.set(
        db
          .collection(COLECOES.frequenciaDiaria)
          .doc(`${data}-${aluno.matricula}`),
        {
          data,
          matricula: aluno.matricula,
          nome: aluno.nome,
          turmaId: aluno.turmaId ?? null,
          turmaCodigo: aluno.turmaCodigo ?? null,
          situacao,
          observacao: MARCA,
          origem: "portal",
        },
        { merge: true },
      );

      gravados += 1;

      if (gravados % 400 === 0) {
        await lote.commit();
        lote = db.batch();
      }
    }
  }

  await lote.commit();

  return gravados;
}

/** Presente quase sempre; atraso e saída antecipada aparecem de vez em quando. */
function escolherSituacao(semente: number): string {
  if (semente % 11 === 0) return "falta";
  if (semente % 7 === 0) return "atraso";
  if (semente % 13 === 0) return "saida-antecipada";

  return "presente";
}

/**
 * Recuperação final para quem está abaixo da média.
 *
 * Sem ela, o aluno de média baixa para em "Em recuperação" e o cálculo de
 * **média final** — `(anual + recuperação) ÷ 2` — nunca é exercitado. Com
 * ela, alguns passam e outros reprovam, que é o que o QA precisa ver.
 */
async function criarRecuperacoes(
  alocacoes: Array<Alocacao & { id: string }>,
  alunos: Array<{ matricula: string; turmaId?: string | null }>,
  perfilDoAluno: Map<string, (typeof PERFIS)[number]>,
): Promise<number> {
  const disciplinas = [...new Set(alocacoes.map((a) => a.disciplinaId))];
  let gravadas = 0;

  for (const aluno of alunos) {
    const nota = perfilDoAluno.get(aluno.matricula)?.recuperacao;

    // Quem não tem nota de recuperação fica **sem** o documento: é assim
    // que o boletim mostra "Em recuperação", esperando a prova.
    if (nota == null) continue;

    await db
      .collection(COLECOES.boletins)
      .doc(`${ANO}-${aluno.matricula}`)
      .set(
        {
          anoLetivo: ANO,
          matricula: aluno.matricula,
          turmaId: aluno.turmaId ?? null,
          recuperacoes: Object.fromEntries(
            disciplinas.map((disciplina) => [disciplina, nota]),
          ),
          observacoes: MARCA,
          origem: "portal",
        },
        { merge: true },
      );

    gravadas += 1;
  }

  return gravadas;
}

async function apagar() {
  let notas = 0;
  let diarios = 0;
  let chamadas = 0;
  let boletins = 0;

  // Só o que tem a marca: nota lançada pela secretaria durante o teste é
  // do aluno, e apagá-la tiraria do boletim uma marca que pode ser real.
  for (const doc of (await db.collection(COLECOES.notas).get()).docs) {
    if ((doc.data() as { observacoes?: string }).observacoes === MARCA) {
      await doc.ref.delete();
      notas += 1;
    }
  }

  for (const doc of (await db.collection(COLECOES.frequenciaDiaria).get()).docs) {
    if ((doc.data() as { observacao?: string }).observacao === MARCA) {
      await doc.ref.delete();
      chamadas += 1;
    }
  }

  // O boletim guarda a liberação além da recuperação. Apagar o documento
  // inteiro levaria junto o que o QA liberou — então sai só o que foi
  // semeado, e só se ninguém tiver liberado nada nele.
  for (const doc of (await db.collection(COLECOES.boletins).get()).docs) {
    const b = doc.data() as { observacoes?: string; liberacoes?: object };

    if (b.observacoes === MARCA && Object.keys(b.liberacoes ?? {}).length === 0) {
      await doc.ref.delete();
      boletins += 1;
    }
  }

  for (const doc of (await db.collection(COLECOES.diarioClasse).get()).docs) {
    const diario = doc.data() as { turmaId?: string; anoLetivo?: number };

    if (diario.anoLetivo === ANO && TURMAS.includes(diario.turmaId ?? "")) {
      await doc.ref.delete();
      diarios += 1;
    }
  }

  console.log(`
  ${notas} nota(s), ${diarios} diário(s), ${chamadas} lançamento(s) de
  frequência e ${boletins} boletim(ns) removido(s).

  Nota sem a marca de semente não foi tocada — se o QA lançou alguma pela
  tela, ela é do aluno e sai pela tela.
`);
}

// No fim do arquivo: `await` no topo roda antes das declarações abaixo
// dele, e `criar()` usa constantes que ainda não existiriam.
await (apagando ? apagar() : criar());
