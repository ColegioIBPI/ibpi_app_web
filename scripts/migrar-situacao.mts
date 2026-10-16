/**
 * Grava `situacaoMatricula` nos 73 cadastros e remove `statusOriginal`.
 *
 *   npm run alunos:situacao -- --simular   (não grava nada)
 *   npm run alunos:situacao
 *
 * A ordem importa: a situação é gravada **antes** de o texto antigo sair.
 * Se o campo fosse apagado primeiro e a gravação falhasse no meio, parte
 * dos alunos ficaria sem nenhum dos dois.
 *
 * A situação vem de `ativo`, e não de `statusOriginal`: nos 73 os dois
 * dizem a mesma coisa, menos num cadastro editado no Portal depois da
 * carga — e ali quem vale é a edição, não o valor congelado do Access.
 */
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type Aluno } from "@/core/modelo";
import {
  normalizarSituacao,
  situacaoDoMigrado,
} from "@/features/alunos/domain/situacao";

const simulando = process.argv.includes("--simular");
const db = getAdminDb();
const docs = (await db.collection(COLECOES.alunos).get()).docs;

const contagem = new Map<string, number>();
let comTextoAntigo = 0;

console.log(`\n${simulando ? "SIMULAÇÃO — nada será gravado" : "Gravando"}\n`);

for (const doc of docs) {
  const aluno = doc.data() as Aluno;

  const situacao = normalizarSituacao({
    situacaoMatricula:
      aluno.situacaoMatricula ?? situacaoDoMigrado(aluno.ativo),
    dataDaSituacao: aluno.dataDaSituacao,
    dataMatricula: aluno.dataMatricula,
  });

  contagem.set(
    situacao.situacaoMatricula,
    (contagem.get(situacao.situacaoMatricula) ?? 0) + 1,
  );

  const tinha = "statusOriginal" in aluno;
  if (tinha) comTextoAntigo += 1;

  if (simulando) continue;

  await doc.ref.update({
    situacaoMatricula: situacao.situacaoMatricula,
    dataDaSituacao: situacao.dataDaSituacao,
    // Sai só depois de a situação estar gravada, no mesmo `update`.
    ...(tinha ? { statusOriginal: FieldValue.delete() } : {}),
  });
}

console.log("situação gravada:");
for (const [valor, n] of contagem) console.log(`  ${valor.padEnd(12)} ${n}`);
console.log(`\n${comTextoAntigo} cadastros tinham statusOriginal.`);

if (!simulando) {
  await db.collection(COLECOES.auditoria).add({
    colecao: COLECOES.alunos,
    documentoId: "(todos)",
    acao: "alterou",
    alteracoes: {
      situacaoMatricula: { de: null, para: "derivada de `ativo`" },
      statusOriginal: { de: "texto do Access", para: null },
    },
    autorUid: "migracao",
    autorNome: "Migração da situação da matrícula",
    autorPerfil: "admin",
    em: new Date().toISOString(),
  });

  // Confere o resultado em vez de confiar no que acabou de escrever.
  const depois = (await db.collection(COLECOES.alunos).get()).docs;
  const semSituacao = depois.filter(
    (d) => !(d.data() as Aluno).situacaoMatricula,
  ).length;
  const aindaComTexto = depois.filter(
    (d) => "statusOriginal" in d.data(),
  ).length;

  console.log("\n--- conferência ---");
  console.log(`  sem situacaoMatricula: ${semSituacao}`);
  console.log(`  ainda com statusOriginal: ${aindaComTexto}`);
}
console.log();
process.exit(0);
