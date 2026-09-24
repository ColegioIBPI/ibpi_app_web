/**
 * Grava a ordem das disciplinas no boletim.
 *
 *   npm run disciplinas:ordenar
 *   npm run disciplinas:ordenar -- --criar-faltantes
 *
 * A ordem é a do `boletim_resultado.pdf` que o colégio emite — pedagógica,
 * não alfabética. Ela vive no cadastro (`disciplinas.ordem`) e não numa
 * lista fixa no código: é decisão do colégio, e muda sem depender de um
 * deploy.
 *
 * Os valores vão de 10 em 10 para caber uma disciplina nova entre duas
 * existentes sem renumerar todas.
 *
 * Três disciplinas do boletim **não vieram do Access** — a tabela de origem
 * é antiga. Sem `--criar-faltantes` o script apenas as aponta; com a
 * opção, ele as cadastra com o nome que está no boletim.
 */
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES } from "@/core/modelo";
import { disciplinaSchema } from "@/core/modelo/escola";

/**
 * A ordem do boletim do colégio, com a posição explícita.
 *
 * A **110 está reservada ao Projeto Bilíngue**, que no boletim fica entre
 * Projeto de Vida e Educação Física mas não é um documento desta coleção —
 * é um bloco próprio, com STEAM, ENGLISH e PROJECT.
 */
const ORDEM: { id: string; nome: string; ordem: number }[] = [
  { ordem: 10, id: "portugues-literatura", nome: "Português/Literatura" },
  { ordem: 20, id: "oficina-de-textos", nome: "Oficina de Textos" },
  { ordem: 30, id: "geografia", nome: "Geografia" },
  { ordem: 40, id: "historia", nome: "História" },
  { ordem: 50, id: "filosofia-sociologia", nome: "Filosofia/Sociologia" },
  { ordem: 60, id: "matematica", nome: "Matemática" },
  { ordem: 70, id: "fisica", nome: "Física" },
  { ordem: 80, id: "quimica", nome: "Química" },
  { ordem: 90, id: "biologia", nome: "Biologia" },
  { ordem: 100, id: "projeto-de-vida", nome: "Projeto de Vida" },
  { ordem: 120, id: "educacao-fisica", nome: "Educação Física" },
];

const POSICOES = new Map(ORDEM.map(({ id, ordem }) => [id, ordem]));

const criarFaltantes = process.argv.includes("--criar-faltantes");
const db = getAdminDb();

const existentes = new Set(
  (await db.collection(COLECOES.disciplinas).get()).docs.map((doc) => doc.id),
);

const faltantes: { id: string; nome: string }[] = [];
let ordenadas = 0;

for (const disciplina of ORDEM) {
  const { ordem } = disciplina;

  if (!existentes.has(disciplina.id)) {
    faltantes.push(disciplina);

    if (!criarFaltantes) continue;

    const nova = disciplinaSchema.parse({
      nome: disciplina.nome,
      sigla: null,
      grafiasOriginais: [],
      ordem,
      ativa: true,
      origem: "portal",
    });

    await db.collection(COLECOES.disciplinas).doc(disciplina.id).set(nova);
    console.log(`criada   ${disciplina.id} (ordem ${ordem})`);
    ordenadas += 1;
    continue;
  }

  await db
    .collection(COLECOES.disciplinas)
    .doc(disciplina.id)
    .set({ ordem }, { merge: true });

  console.log(`ordenada ${disciplina.id} → ${ordem}`);
  ordenadas += 1;
}

console.log(`\n${ordenadas} disciplinas com ordem definida.`);

const naoCriadas = criarFaltantes ? [] : faltantes;

if (naoCriadas.length > 0) {
  console.log(
    `\n${naoCriadas.length} disciplinas do boletim não existem no cadastro:`,
  );
  for (const d of naoCriadas) console.log(`  ${d.id} — ${d.nome}`);
  console.log(
    "\nElas não vieram do Access. Para cadastrá-las com o nome do boletim:" +
      "\n  npm run disciplinas:ordenar -- --criar-faltantes\n",
  );
}

// As demais ficam sem ordem e caem no fim do boletim, em ordem de nome —
// visível o bastante para alguém notar que falta ordená-las.
const semOrdem = [...existentes].filter((id) => !POSICOES.has(id));
console.log(
  `${semOrdem.length} disciplinas continuam sem ordem; elas aparecem no fim do boletim.`,
);
