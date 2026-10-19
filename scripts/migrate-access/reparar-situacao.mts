/**
 * Preenche a **data de cancelamento** dos alunos migrados.
 *
 * O Access tem a coluna `DataStatus`, e a migração não a trouxe: os 11
 * cancelados ficaram com `dataDaSituacao` vazia, e a coluna "Data de
 * cancelamento" da ata saía em branco para eles.
 *
 * A data existe na origem para **10** dos 11 — a décima primeira matrícula
 * foi cancelada no Portal, depois da migração, e lá o Access ainda diz
 * "Ativo". Essa fica para a secretaria preencher, porque o sistema não tem
 * de onde tirar.
 *
 * Só toca em `alunos`, e só em `dataDaSituacao`. É idempotente: rodar de
 * novo grava o mesmo valor.
 *
 * **Não toca em quem o Portal já preencheu.** Sobrescrever a data que
 * alguém digitou na secretaria por uma do sistema antigo apagaria a
 * correção — e a correção é que está certa, porque foi feita olhando o
 * papel.
 *
 * Rode com `--aplicar`. Sem isso, só mostra o que faria: é alteração em
 * cadastro de aluno, e ver antes custa um segundo.
 */
import { readFileSync } from "node:fs";

import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES } from "@/core/modelo";

interface LinhaDoAccess {
  Matricula?: unknown;
  Status?: unknown;
  DataStatus?: unknown;
}

const APLICAR = process.argv.includes("--aplicar");

const brutos: LinhaDoAccess[] = JSON.parse(
  readFileSync("scripts/migrate-access/data/Tabela_Aluno.json", "utf-8"),
);

/** `2026-07-22T00:00:00` → `2026-07-22`. */
function paraData(valor: unknown): string | null {
  const texto = String(valor ?? "").trim();

  return /^\d{4}-\d{2}-\d{2}/.test(texto) ? texto.slice(0, 10) : null;
}

const datasDoAccess = new Map<string, string>();
for (const linha of brutos) {
  const data = paraData(linha.DataStatus);
  if (data) datasDoAccess.set(String(linha.Matricula).trim(), data);
}

const db = getAdminDb();
const docs = await db.collection(COLECOES.alunos).get();

const lote = db.batch();
let gravados = 0;
const pulados: string[] = [];
const semOrigem: string[] = [];

for (const doc of docs.docs) {
  const aluno = doc.data() as {
    nome?: string;
    situacaoMatricula?: string;
    dataDaSituacao?: string | null;
  };

  if (aluno.situacaoMatricula === "ativa") continue;

  // Já preenchido — pela secretaria ou por uma rodada anterior.
  if (aluno.dataDaSituacao) {
    pulados.push(`${doc.id} (já tem ${aluno.dataDaSituacao})`);
    continue;
  }

  const data = datasDoAccess.get(doc.id);

  if (!data) {
    semOrigem.push(`${doc.id} ${aluno.nome ?? ""}`);
    continue;
  }

  console.log(`  ${doc.id}  ${data}  ${aluno.nome ?? ""}`);
  lote.update(doc.ref, { dataDaSituacao: data });
  gravados += 1;
}

console.log(`\n${gravados} aluno(s) com data a preencher.`);

if (pulados.length > 0) {
  console.log(`${pulados.length} pulado(s), já preenchido(s): ${pulados.join(", ")}`);
}

if (semOrigem.length > 0) {
  console.log(
    `\n${semOrigem.length} sem data no Access — cancelado(s) depois da migração.\n` +
      `A secretaria preenche em /gestao/alunos/situacao:\n  ${semOrigem.join("\n  ")}`,
  );
}

if (!APLICAR) {
  console.log("\nNada foi gravado. Rode com --aplicar para gravar.");
} else if (gravados > 0) {
  await lote.commit();
  console.log("\nGravado.");
} else {
  console.log("\nNada a gravar.");
}
