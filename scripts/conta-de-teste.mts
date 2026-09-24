/**
 * Conta de teste de professor, para experimentar o Portal.
 *
 *   npm run conta:teste            cria (ou recria) a conta
 *   npm run conta:teste -- --apagar   remove tudo que ela criou
 *
 * Faz o mesmo que as telas da secretaria fariam: cadastro de professor,
 * conta de acesso e **alocações**. Sem alocação o professor entra e não vê
 * nada — diário, notas e frequência ficam todos vazios, e a conta não serve
 * para testar.
 *
 * O banco é o de produção (ambiente único, risco aceito no README, seção
 * 6.5). Por isso a senha é sorteada a cada execução, em vez de fixa no
 * código, e o `--apagar` existe para a conta não ficar esquecida ligada.
 */
import { randomBytes } from "node:crypto";

import { criarOuAtualizarConta } from "@/core/auth/contas";
import { getAdminAuth, getAdminDb } from "@/core/firebase/admin";
import { COLECOES } from "@/core/modelo";

const ID_DO_PROFESSOR = "teste-professor";
const EMAIL = "professor.teste@ibpi.com.br";
const NOME = "Professor de Teste";

/**
 * Duas turmas e duas disciplinas: o suficiente para a lista de alocações ter
 * mais de uma linha e o recorte de escopo ficar visível na tela de alunos.
 */
const ALOCACOES = [
  { turmaId: "2026-EM2A", turmaCodigo: "EM2A", disciplinaId: "fisica", disciplinaNome: "Física" },
  { turmaId: "2026-EM2A", turmaCodigo: "EM2A", disciplinaId: "matematica", disciplinaNome: "Matemática" },
  { turmaId: "2026-EM3A", turmaCodigo: "EM3A", disciplinaId: "fisica", disciplinaNome: "Física" },
];

const TURMAS = [...new Set(ALOCACOES.map((a) => a.turmaId))];

const db = getAdminDb();

if (process.argv.includes("--apagar")) {
  await apagar();
} else {
  await criar();
}

async function criar() {
  const senha = `Teste-${randomBytes(6).toString("base64url")}`;

  const conta = await criarOuAtualizarConta({
    email: EMAIL,
    nome: NOME,
    role: "professor",
    turmas: TURMAS,
    senha,
  });

  await db.collection(COLECOES.professores).doc(ID_DO_PROFESSOR).set(
    {
      nome: NOME,
      nomeParaBusca: NOME.toUpperCase(),
      email: EMAIL,
      telefones: [],
      uid: conta.uid,
      turmas: TURMAS,
      ativo: true,
      origem: "portal",
      atualizadoEm: new Date().toISOString(),
    },
    { merge: true },
  );

  for (const alocacao of ALOCACOES) {
    await db
      .collection(COLECOES.alocacoes)
      .doc(`2026-${ID_DO_PROFESSOR}-${alocacao.turmaId}-${alocacao.disciplinaId}`)
      .set(
        {
          anoLetivo: 2026,
          professorId: ID_DO_PROFESSOR,
          professorNome: NOME,
          ...alocacao,
          ativa: true,
          origem: "portal",
        },
        { merge: true },
      );
  }

  console.log("\n  Conta de teste de professor criada.\n");
  console.log(`  E-mail: ${EMAIL}`);
  console.log(`  Senha:  ${senha}`);
  console.log(`  Turmas: ${ALOCACOES.map((a) => `${a.disciplinaNome} em ${a.turmaCodigo}`).join(", ")}\n`);
  console.log("  Para remover depois:  npm run conta:teste -- --apagar\n");
}

async function apagar() {
  for (const colecao of [COLECOES.diarioClasse, COLECOES.alocacoes]) {
    for (const doc of (await db.collection(colecao).get()).docs) {
      if (doc.id.includes(ID_DO_PROFESSOR)) {
        await doc.ref.delete();
        console.log(`apagado ${colecao}/${doc.id}`);
      }
    }
  }

  await db.collection(COLECOES.professores).doc(ID_DO_PROFESSOR).delete();
  console.log(`apagado professores/${ID_DO_PROFESSOR}`);

  const auth = getAdminAuth();
  const usuario = await auth.getUserByEmail(EMAIL).catch(() => null);

  if (usuario) {
    await db.collection(COLECOES.users).doc(usuario.uid).delete();
    await auth.deleteUser(usuario.uid);
    console.log(`apagada a conta ${EMAIL}`);
  }

  // Nota lançada pertence ao aluno, não ao professor: apagá-la aqui tiraria
  // do boletim uma nota que talvez seja real.
  console.log(
    "\nNotas lançadas pela conta continuam no banco — elas são do aluno.\n" +
      "Se forem de teste, corrija pela tela de notas.\n",
  );
}
