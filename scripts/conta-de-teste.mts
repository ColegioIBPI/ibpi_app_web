/**
 * Contas de teste, para experimentar o Portal por dentro de cada perfil.
 *
 *   npm run conta:teste -- --perfil professor
 *   npm run conta:teste -- --perfil responsavel
 *   npm run conta:teste -- --perfil professor --apagar
 *
 * Cada conta é montada como as telas da secretaria montariam: além do
 * acesso, o **cadastro** e os **vínculos** correspondentes. Sem eles a
 * pessoa entra e não vê nada — o professor sem alocação abre o diário
 * vazio, o responsável sem filho vinculado abre o portal vazio —, e a conta
 * não serve para testar.
 *
 * O banco é o de produção (ambiente único, risco aceito no README, seção
 * 6.5). Por isso a senha é sorteada a cada execução, em vez de fixa no
 * código, e o `--apagar` existe para a conta não ficar esquecida ligada.
 *
 * Os cadastros de teste **não tocam nos registros reais**: o responsável de
 * teste é um documento novo, e os alunos vinculados continuam com os
 * responsáveis que já tinham.
 */
import { randomBytes } from "node:crypto";

import { criarOuAtualizarConta } from "@/core/auth/contas";
import { getAdminAuth, getAdminDb } from "@/core/firebase/admin";
import { COLECOES } from "@/core/modelo";

const PROFESSOR = {
  id: "teste-professor",
  email: "professor.teste@ibpi.com.br",
  nome: "Professor de Teste",
  /**
   * Duas turmas e duas disciplinas: o suficiente para a lista de alocações
   * ter mais de uma linha e o recorte de escopo ficar visível na tela de
   * alunos.
   */
  alocacoes: [
    { turmaId: "2026-EM2A", turmaCodigo: "EM2A", disciplinaId: "fisica", disciplinaNome: "Física" },
    { turmaId: "2026-EM2A", turmaCodigo: "EM2A", disciplinaId: "matematica", disciplinaNome: "Matemática" },
    { turmaId: "2026-EM3A", turmaCodigo: "EM3A", disciplinaId: "fisica", disciplinaNome: "Física" },
  ],
};

const RESPONSAVEL = {
  id: "teste-responsavel",
  email: "responsavel.teste@ibpi.com.br",
  nome: "Responsável de Teste",
  /**
   * Dois filhos, de propósito: com um só o seletor de aluno do portal não
   * aparece, e é justamente ele que precisa ser testado. Os dois estão nas
   * turmas do professor de teste, então nota lançada por ele aparece aqui.
   */
  filhos: ["26029", "25022"],
};

const db = getAdminDb();
const argumentos = process.argv.slice(2);
const apagando = argumentos.includes("--apagar");
const perfil = argumentos[argumentos.indexOf("--perfil") + 1] ?? "professor";

if (perfil !== "professor" && perfil !== "responsavel") {
  console.error(`\nPerfil inválido: ${perfil}. Use professor ou responsavel.\n`);
  process.exit(1);
}

if (apagando) {
  await (perfil === "professor" ? apagarProfessor() : apagarResponsavel());
} else {
  await (perfil === "professor" ? criarProfessor() : criarResponsavel());
}

async function criarProfessor() {
  const senha = novaSenha();
  const turmas = [...new Set(PROFESSOR.alocacoes.map((a) => a.turmaId))];

  const conta = await criarOuAtualizarConta({
    email: PROFESSOR.email,
    nome: PROFESSOR.nome,
    role: "professor",
    turmas,
    senha,
  });

  await db.collection(COLECOES.professores).doc(PROFESSOR.id).set(
    {
      nome: PROFESSOR.nome,
      nomeParaBusca: PROFESSOR.nome.toUpperCase(),
      email: PROFESSOR.email,
      telefones: [],
      uid: conta.uid,
      turmas,
      ativo: true,
      origem: "portal",
      atualizadoEm: new Date().toISOString(),
    },
    { merge: true },
  );

  for (const alocacao of PROFESSOR.alocacoes) {
    await db
      .collection(COLECOES.alocacoes)
      .doc(`2026-${PROFESSOR.id}-${alocacao.turmaId}-${alocacao.disciplinaId}`)
      .set(
        {
          anoLetivo: 2026,
          professorId: PROFESSOR.id,
          professorNome: PROFESSOR.nome,
          ...alocacao,
          ativa: true,
          origem: "portal",
        },
        { merge: true },
      );
  }

  anunciar("professor", PROFESSOR.email, senha, [
    `Alocações: ${PROFESSOR.alocacoes
      .map((a) => `${a.disciplinaNome} em ${a.turmaCodigo}`)
      .join(", ")}`,
  ]);
}

async function criarResponsavel() {
  const senha = novaSenha();

  const conta = await criarOuAtualizarConta({
    email: RESPONSAVEL.email,
    nome: RESPONSAVEL.nome,
    role: "responsavel",
    alunosVinculados: RESPONSAVEL.filhos,
    senha,
  });

  await db.collection(COLECOES.responsaveis).doc(RESPONSAVEL.id).set(
    {
      nome: RESPONSAVEL.nome,
      parentesco: "Responsável",
      email: RESPONSAVEL.email,
      alunosVinculados: RESPONSAVEL.filhos,
      uid: conta.uid,
      ativo: true,
      origem: "portal",
      atualizadoEm: new Date().toISOString(),
    },
    { merge: true },
  );

  const nomes = await Promise.all(
    RESPONSAVEL.filhos.map(async (matricula) => {
      const doc = await db.collection(COLECOES.alunos).doc(matricula).get();
      const aluno = doc.data();
      return `${aluno?.nome ?? matricula} (${aluno?.turmaCodigo ?? "sem turma"})`;
    }),
  );

  anunciar("responsavel", RESPONSAVEL.email, senha, [
    `Filhos vinculados: ${nomes.join(" e ")}`,
  ]);
}

async function apagarProfessor() {
  for (const colecao of [COLECOES.diarioClasse, COLECOES.alocacoes]) {
    for (const doc of (await db.collection(colecao).get()).docs) {
      if (doc.id.includes(PROFESSOR.id)) {
        await doc.ref.delete();
        console.log(`apagado ${colecao}/${doc.id}`);
      }
    }
  }

  await db.collection(COLECOES.professores).doc(PROFESSOR.id).delete();
  console.log(`apagado professores/${PROFESSOR.id}`);

  await apagarConta(PROFESSOR.email);

  // Nota lançada pertence ao aluno, não ao professor: apagá-la aqui tiraria
  // do boletim uma marca que talvez seja real.
  console.log(
    "\nNotas lançadas pela conta continuam no banco — elas são do aluno.\n" +
      "Se forem de teste, corrija pela tela de notas.\n",
  );
}

async function apagarResponsavel() {
  await db.collection(COLECOES.responsaveis).doc(RESPONSAVEL.id).delete();
  console.log(`apagado responsaveis/${RESPONSAVEL.id}`);

  await apagarConta(RESPONSAVEL.email);

  // Os alunos não foram alterados na criação, então não há nada a desfazer
  // neles: eles continuam com os responsáveis reais que já tinham.
  console.log("\nOs alunos vinculados não foram tocados.\n");
}

async function apagarConta(email: string) {
  const auth = getAdminAuth();
  const usuario = await auth.getUserByEmail(email).catch(() => null);

  if (!usuario) return;

  await db.collection(COLECOES.users).doc(usuario.uid).delete();
  await auth.deleteUser(usuario.uid);
  console.log(`apagada a conta ${email}`);
}

function novaSenha(): string {
  return `Teste-${randomBytes(6).toString("base64url")}`;
}

function anunciar(
  perfil: string,
  email: string,
  senha: string,
  detalhes: string[],
) {
  console.log(`\n  Conta de teste (${perfil}) criada.\n`);
  console.log(`  E-mail: ${email}`);
  console.log(`  Senha:  ${senha}`);
  for (const detalhe of detalhes) console.log(`  ${detalhe}`);
  console.log(
    `\n  Para remover:  npm run conta:teste -- --perfil ${perfil} --apagar\n`,
  );
}
