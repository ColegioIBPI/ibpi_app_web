/**
 * Desfaz a passagem de alunos para um ano letivo.
 *
 * `passarAlunosDeTurma` grava duas coisas: o registro de matrícula do ano
 * novo e o cadastro do aluno apontando para a turma nova. Desfazer é
 * apagar o primeiro e devolver o segundo ao que o **registro do ano
 * anterior** diz — ele é quem sabe em que turma o aluno estava.
 *
 * Existe porque a tela deixou passar um erro real: com uma única turma
 * no ano novo, dezessete alunos de duas turmas diferentes foram parar na
 * mesma. A tela foi corrigida para avisar; os dados precisam de conserto
 * à mão.
 *
 * **Não é um "desfazer" de uso corrente.** Depois que o ano novo tem
 * nota, frequência ou diário, apagar a matrícula deixa esses lançamentos
 * órfãos — por isso o script recusa quando encontra qualquer um deles.
 *
 * Uso:
 *   npx tsx --conditions=react-server --env-file=.env.local \
 *     scripts/desfazer-passagem-de-ano.mts 2027 [--gravar]
 *
 * Sem `--gravar` ele só mostra o que faria.
 */

import { getAdminDb } from "../src/core/firebase/admin";
import { COLECOES, type Matricula } from "../src/core/modelo";

const anoNovo = Number(process.argv[2]);
const gravar = process.argv.includes("--gravar");

if (!Number.isInteger(anoNovo)) {
  console.error("Informe o ano a desfazer. Ex.: ... script.mts 2027 --gravar");
  process.exit(1);
}

const anoAnterior = anoNovo - 1;
const db = getAdminDb();

const [doAnoNovo, doAnterior] = await Promise.all([
  db.collection(COLECOES.matriculas).where("anoLetivo", "==", anoNovo).get(),
  db.collection(COLECOES.matriculas).where("anoLetivo", "==", anoAnterior).get(),
]);

if (doAnoNovo.empty) {
  console.log(`${anoNovo} não tem matrícula nenhuma. Nada a desfazer.`);
  process.exit(0);
}

/*
  Recusa se o ano novo já tem vida própria. Apagar a matrícula de um
  aluno que já tem nota lançada deixaria a nota sem dono — e isso é pior
  que o erro que viemos consertar.
*/
const [notas, frequencia, diario, boletins] = await Promise.all([
  db.collection(COLECOES.notas).where("anoLetivo", "==", anoNovo).get(),
  db.collection(COLECOES.frequenciaDiaria).where("anoLetivo", "==", anoNovo).get(),
  db.collection(COLECOES.diarioClasse).where("anoLetivo", "==", anoNovo).get(),
  db.collection(COLECOES.boletins).where("anoLetivo", "==", anoNovo).get(),
]);

const lancamentos =
  notas.size + frequencia.size + diario.size + boletins.size;

if (lancamentos > 0) {
  console.error(
    `${anoNovo} já tem ${lancamentos} lançamentos (notas, frequência, diário ou boletim).\n` +
      "Desfazer deixaria esses registros sem matrícula. Corrija pela ficha de cada aluno.",
  );
  process.exit(1);
}

const anterior = new Map(
  doAnterior.docs.map((doc) => [
    (doc.data() as Matricula).matricula,
    doc.data() as Matricula,
  ]),
);

const agora = new Date().toISOString();
const lote = db.batch();
let desfeitos = 0;
let semOrigem = 0;

for (const doc of doAnoNovo.docs) {
  const registro = doc.data() as Matricula;
  const origem = anterior.get(registro.matricula);

  if (!origem) {
    // Aluno que nasceu no ano novo, e não veio de passagem nenhuma.
    // Apagá-lo seria apagar uma matrícula legítima.
    console.warn(
      `  ! ${registro.matricula} não tem registro em ${anoAnterior} — mantido`,
    );
    semOrigem += 1;
    continue;
  }

  console.log(
    `  ${registro.matricula} ${registro.nome}: ` +
      `${anoNovo}/${registro.turmaCodigo} → volta para ${anoAnterior}/${origem.turmaCodigo}`,
  );

  lote.delete(doc.ref);

  lote.set(
    db.collection(COLECOES.alunos).doc(registro.matricula),
    {
      turmaId: origem.turmaId,
      turmaCodigo: origem.turmaCodigo,
      segmento: origem.segmento,
      turno: origem.turno,
      atualizadoEm: agora,
    },
    { merge: true },
  );

  lote.set(db.collection(COLECOES.auditoria).doc(), {
    colecao: COLECOES.matriculas,
    documentoId: doc.id,
    acao: "removeu",
    alteracoes: {
      turma: { de: registro.turmaId, para: origem.turmaId },
    },
    autorUid: "script",
    autorNome: "scripts/desfazer-passagem-de-ano.mts",
    autorPerfil: "admin",
    em: agora,
  });

  desfeitos += 1;
}

console.log(
  `\n${doAnoNovo.size} matrículas em ${anoNovo}: ${desfeitos} a desfazer` +
    (semOrigem > 0 ? `, ${semOrigem} mantidas por não virem de passagem` : "") +
    ".",
);

if (desfeitos > 0 && gravar) {
  await lote.commit();
  console.log("Gravado.");
} else if (desfeitos > 0) {
  console.log("Nada gravado — rode de novo com --gravar.");
}

process.exit(0);
