/**
 * Remove `chavesDeAviso`, nome antigo de `chavesDeAlcance`.
 *
 *   npm run avisos:limpar -- --simular
 *   npm run avisos:limpar
 *
 * O campo ficou congelado quando o nome mudou: o servidor só atualiza o
 * novo. Enquanto ele existir, alguém — o aplicativo, um script — pode ler
 * o antigo e achar que funciona, até o dia em que um aluno muda de turma.
 *
 * Só apaga a conta cujo campo antigo **bate** com o atual. Divergência
 * significa que o novo não foi gravado, e aí o que falta é rodar
 * `npm run avisos:chaves`, não apagar a única cópia.
 */
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES } from "@/core/modelo";

const simulando = process.argv.includes("--simular");
const db = getAdminDb();

const mesmasChaves = (a: string[] = [], b: string[] = []) =>
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

console.log(`\n${simulando ? "SIMULAÇÃO — nada será gravado" : "Limpando"}\n`);

let limpas = 0;
let mantidas = 0;

for (const doc of (await db.collection(COLECOES.users).get()).docs) {
  const dados = doc.data();
  if (!dados.chavesDeAviso) continue;

  const nome = String(dados.nome ?? doc.id);

  if (!mesmasChaves(dados.chavesDeAviso, dados.chavesDeAlcance)) {
    console.log(`  MANTIDO  ${nome} — diverge de chavesDeAlcance`);
    console.log("           rode `npm run avisos:chaves` antes.");
    mantidas += 1;
    continue;
  }

  if (!simulando) {
    await doc.ref.update({ chavesDeAviso: FieldValue.delete() });
  }
  console.log(`  limpo    ${nome}`);
  limpas += 1;
}

console.log(`\n${limpas} limpas, ${mantidas} mantidas.`);

if (!simulando && limpas > 0) {
  await db.collection(COLECOES.auditoria).add({
    colecao: COLECOES.users,
    documentoId: "(todos)",
    acao: "alterou",
    alteracoes: {
      chavesDeAviso: { de: "campo antigo, congelado", para: null },
    },
    autorUid: "migracao",
    autorNome: "Remoção do campo chavesDeAviso",
    autorPerfil: "admin",
    em: new Date().toISOString(),
  });

  // Relê em vez de confiar no que acabou de escrever.
  const sobrando = (await db.collection(COLECOES.users).get()).docs.filter(
    (d) => "chavesDeAviso" in d.data(),
  ).length;
  console.log(`\nconferência — contas ainda com o campo: ${sobrando}`);
}
console.log();
process.exit(0);
