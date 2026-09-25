/**
 * Preenche `users/{uid}.chavesDeAviso` nas contas que já existem.
 *
 *   npm run avisos:chaves
 *
 * A partir daqui o Portal mantém as chaves em dia sozinho — na criação da
 * conta, na troca de vínculo e na troca de turma do aluno. Este script é
 * para as contas criadas **antes** disso existir, e serve de conferência
 * quando algo parece fora do lugar.
 *
 * É idempotente: rodar de novo reescreve os mesmos valores.
 */
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES } from "@/core/modelo";
import { sincronizarChavesPorUid } from "@/features/avisos/services/chaves.server";

const db = getAdminDb();

const contas = await db
  .collection(COLECOES.users)
  .where("role", "in", ["aluno", "responsavel"])
  .get();

console.log(`\n${contas.size} contas de família.\n`);

let comChaves = 0;

for (const doc of contas.docs) {
  const chaves = await sincronizarChavesPorUid(doc.id);
  const dados = doc.data();

  console.log(`  ${String(dados.nome ?? doc.id).padEnd(30)} ${chaves.join("  ")}`);

  if (chaves.length > 1) comChaves += 1;
}

console.log(
  `\n${comChaves} contas alcançam algo além do aviso geral.` +
    (comChaves < contas.size
      ? `\n${contas.size - comChaves} só têm "todos" — provavelmente sem aluno` +
        ` vinculado ou com o aluno sem turma.`
      : ""),
);
