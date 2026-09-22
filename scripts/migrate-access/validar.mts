/**
 * Confere o que está no Firestore contra o que foi extraído do Access.
 *
 *   npm run migrar:validar
 *
 * Migração que não é conferida é migração em que ninguém confia. Este script
 * compara contagens, procura documento órfão e faz uma amostragem de campos.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const DIRETORIO = join(dirname(fileURLToPath(import.meta.url)), "data");
const relatorio = JSON.parse(
  readFileSync(join(DIRETORIO, "_relatorio.json"), "utf8"),
);

const credencial = process.env.FIREBASE_SERVICE_ACCOUNT!;
if (getApps().length === 0) {
  initializeApp({
    credential: cert(
      JSON.parse(
        credencial.trim().startsWith("{")
          ? credencial
          : Buffer.from(credencial, "base64").toString("utf8"),
      ),
    ),
  });
}

const db = getFirestore();
let falhas = 0;

console.log("\nValidação da migração\n");
console.log("Contagens (esperado × no Firestore):");

for (const [colecao, esperado] of Object.entries(relatorio.contagens)) {
  const { count } = (await db.collection(colecao).count().get()).data();
  const ok = count === esperado;
  if (!ok) falhas += 1;
  console.log(
    `  ${ok ? "ok  " : "FALHA"} ${colecao.padEnd(14)} ${String(esperado).padStart(5)} × ${String(count).padStart(5)}`,
  );
}

// Integridade referencial: todo aluno aponta para uma turma que existe, e
// toda cobrança para um aluno que existe.
const turmas = new Set(
  (await db.collection("turmas").get()).docs.map((d) => d.id),
);
const alunos = new Map(
  (await db.collection("alunos").get()).docs.map((d) => [d.id, d.data()]),
);

const semTurma = [...alunos.values()].filter(
  (a) => !a.turmaId || !turmas.has(a.turmaId as string),
);
const cobrancas = await db.collection("cobrancas").get();
const cobrancasOrfas = cobrancas.docs.filter(
  (d) => !alunos.has(d.data().matricula as string),
);

console.log("\nIntegridade:");
console.log(
  `  ${semTurma.length === 0 ? "ok  " : "AVISO"} alunos sem turma válida: ${semTurma.length}`,
);
console.log(
  `  ${cobrancasOrfas.length === 0 ? "ok  " : "AVISO"} cobranças sem aluno correspondente: ${cobrancasOrfas.length}`,
);

if (cobrancasOrfas.length > 0) {
  const matriculas = [
    ...new Set(cobrancasOrfas.map((d) => d.data().matricula)),
  ];
  console.log(`        matrículas: ${matriculas.slice(0, 12).join(", ")}`);
}

// Amostragem: campos que passaram por limpeza pesada.
interface Contato {
  emails?: string[];
  telefones?: string[];
}

const contatoDe = (aluno: FirebaseFirestore.DocumentData): Contato =>
  (aluno.contato ?? {}) as Contato;

const comEmail = [...alunos.values()].filter(
  (a) => (contatoDe(a).emails ?? []).length > 0,
);
const comTelefone = [...alunos.values()].filter(
  (a) => (contatoDe(a).telefones ?? []).length > 0,
);
const ativos = [...alunos.values()].filter((a) => a.ativo);

console.log("\nAmostragem de preenchimento:");
console.log(`  alunos ativos:            ${ativos.length} de ${alunos.size}`);
console.log(`  com e-mail:               ${comEmail.length}`);
console.log(`  com telefone normalizado: ${comTelefone.length}`);

const responsaveis = await db.collection("responsaveis").get();
const comFilhos = responsaveis.docs.filter(
  (d) => (d.data().alunosVinculados as string[]).length > 0,
);
const comMaisDeUmFilho = responsaveis.docs.filter(
  (d) => (d.data().alunosVinculados as string[]).length > 1,
);

console.log(
  `  responsáveis com vínculo: ${comFilhos.length} de ${responsaveis.size}`,
);
console.log(`  responsáveis com 2+ filhos: ${comMaisDeUmFilho.length}`);

console.log(
  falhas === 0
    ? "\nTudo confere.\n"
    : `\n${falhas} coleção(ões) com contagem divergente.\n`,
);

process.exitCode = falhas === 0 ? 0 : 1;
