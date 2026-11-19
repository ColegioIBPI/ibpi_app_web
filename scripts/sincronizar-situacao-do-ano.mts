/**
 * Alinha a situação dos registros de matrícula de um ano com o cadastro.
 *
 * Até a situação passar a ser **por ano letivo**, só o cadastro do aluno
 * era atualizado: `matriculas/{ano}-{matrícula}` nasceu na migração com a
 * situação daquele dia e nunca mais mudou. Resultado: um aluno cancelado
 * em junho continuava `ativa` no registro de 2026, e a `dataDaSituacao`
 * não existia em nenhum deles.
 *
 * Este script é a correção de uma vez só. **Rode apenas no ano que era o
 * corrente** quando a situação ainda vivia no cadastro — para um ano
 * passado ele faria o contrário do que se quer, carimbando nele a
 * situação de hoje.
 *
 * Uso:
 *   npx tsx --conditions=react-server --env-file=.env.local \
 *     scripts/sincronizar-situacao-do-ano.mts 2026 [--gravar]
 *
 * Sem `--gravar` ele só mostra o que mudaria.
 */

import { getAdminDb } from "../src/core/firebase/admin";
import { COLECOES, type Aluno, type Matricula } from "../src/core/modelo";
import {
  dataDoStatus,
  situacaoDoMigrado,
} from "../src/features/alunos/domain/situacao";

const anoLetivo = Number(process.argv[2]);
const gravar = process.argv.includes("--gravar");

if (!Number.isInteger(anoLetivo)) {
  console.error("Informe o ano letivo. Ex.: ... script.mts 2026 --gravar");
  process.exit(1);
}

const db = getAdminDb();

const [alunos, registros] = await Promise.all([
  db.collection(COLECOES.alunos).get(),
  db.collection(COLECOES.matriculas).where("anoLetivo", "==", anoLetivo).get(),
]);

const cadastro = new Map(
  alunos.docs.map((doc) => [doc.id, doc.data() as Aluno]),
);

const lote = db.batch();
let mudancas = 0;

for (const doc of registros.docs) {
  const registro = doc.data() as Matricula;
  const aluno = cadastro.get(registro.matricula);

  if (!aluno) {
    console.warn(`  ! ${registro.matricula} não está no cadastro — pulado`);
    continue;
  }

  // Cadastro migrado não tem `situacaoMatricula`: `ativo` é o que existe
  // nele, e é de onde a situação é deduzida.
  const situacao =
    aluno.situacaoMatricula ?? situacaoDoMigrado(aluno.ativo ?? true);
  // A mesma regra da gravação: em matrícula ativa a data não é dado
  // nenhum, e no cadastro ela vira a data de matrícula.
  const dataDaSituacao = dataDoStatus({
    situacaoMatricula: situacao,
    dataDaSituacao: aluno.dataDaSituacao ?? null,
  });

  const igual =
    registro.situacao === situacao &&
    (registro.dataDaSituacao ?? null) === dataDaSituacao;

  if (igual) continue;

  console.log(
    `  ${registro.matricula} ${aluno.nome}: ` +
      `${registro.situacao} → ${situacao}` +
      (dataDaSituacao ? ` (${dataDaSituacao})` : ""),
  );

  lote.update(doc.ref, { situacao, dataDaSituacao });
  mudancas += 1;
}

console.log(
  `\n${registros.size} registros em ${anoLetivo}, ${mudancas} a corrigir.`,
);

if (mudancas > 0 && gravar) {
  await lote.commit();
  console.log("Gravado.");
} else if (mudancas > 0) {
  console.log("Nada gravado — rode de novo com --gravar.");
}

process.exit(0);
