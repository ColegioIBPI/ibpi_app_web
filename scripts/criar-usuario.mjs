/**
 * Cria (ou atualiza) uma conta de acesso ao Portal.
 *
 *   npm run criar:usuario -- --email alguem@ibpi.com.br --nome "Fulano" --perfil secretaria
 *
 * Opções por perfil:
 *   --matricula 1001            aluno: a matrícula dele
 *   --alunos 1001,1002          responsável: matrículas dos filhos
 *   --turmas EM1A,EF7A          professor: turmas que leciona
 *   --senha "..."               define a senha direto (só para conta de teste)
 *
 * Sem `--senha`, o script imprime um link para a pessoa criar a própria
 * senha — é o mesmo mecanismo do primeiro acesso de verdade, e evita que
 * quem cria a conta conheça a senha de alguém.
 *
 * Este script é provisório: na FASE 3.2 a secretaria faz isso pela tela, e a
 * lógica daqui vira a Server Action correspondente.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Mesma lista de `src/core/auth/roles.ts`. Ao mudar lá, mude aqui.
const PERFIS = [
  "aluno",
  "responsavel",
  "professor",
  "secretaria",
  "coordenacao",
  "financeiro",
];

const args = lerArgumentos(process.argv.slice(2));

const email = args.email?.trim().toLowerCase();
const nome = args.nome?.trim();
const perfil = args.perfil?.trim();

if (!email || !nome || !perfil) {
  erro("Informe --email, --nome e --perfil.");
}

if (!PERFIS.includes(perfil)) {
  erro(`Perfil inválido: ${perfil}. Use um de: ${PERFIS.join(", ")}.`);
}

if (args.senha && args.senha.length < 8) {
  erro("A senha precisa ter pelo menos 8 caracteres.");
}

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) erro("FIREBASE_SERVICE_ACCOUNT ausente. Rode pelo npm script.");

if (getApps().length === 0) {
  initializeApp({
    credential: cert(
      JSON.parse(
        raw.trim().startsWith("{")
          ? raw
          : Buffer.from(raw, "base64").toString("utf8"),
      ),
    ),
  });
}

const auth = getAuth();
const db = getFirestore();

// Senha aleatória quando não for informada: a conta nasce inacessível até a
// pessoa usar o link e escolher a dela.
const senha = args.senha ?? senhaAleatoria();

let usuario;
try {
  usuario = await auth.getUserByEmail(email);
  await auth.updateUser(usuario.uid, { displayName: nome });
  console.log(`\nConta já existia: ${email}`);
} catch (causa) {
  if (causa.code !== "auth/user-not-found") throw causa;
  usuario = await auth.createUser({
    email,
    password: senha,
    displayName: nome,
    emailVerified: false,
  });
  console.log(`\nConta criada: ${email}`);
}

// A claim é o que as Security Rules enxergam. Sem ela, a pessoa entra no
// Firebase mas não lê nada.
await auth.setCustomUserClaims(usuario.uid, { role: perfil });

const documento = {
  nome,
  email,
  role: perfil,
  ativo: true,
  atualizadoEm: new Date().toISOString(),
};

if (args.matricula) documento.matricula = String(args.matricula);
if (args.alunos) documento.alunosVinculados = lista(args.alunos);
if (args.turmas) documento.turmas = lista(args.turmas);

await db.collection("users").doc(usuario.uid).set(documento, { merge: true });

console.log(`  uid:    ${usuario.uid}`);
console.log(`  perfil: ${perfil}`);
if (documento.matricula) console.log(`  matrícula: ${documento.matricula}`);
if (documento.alunosVinculados)
  console.log(`  filhos: ${documento.alunosVinculados.join(", ")}`);
if (documento.turmas) console.log(`  turmas: ${documento.turmas.join(", ")}`);

if (args.senha) {
  console.log("\n  Senha definida pelo parâmetro --senha.");
} else {
  const link = await auth.generatePasswordResetLink(email);
  console.log("\n  Abra este link para criar a senha:\n");
  console.log(`  ${link}`);
}

console.log("\nDepois é só entrar em /login.\n");

function lerArgumentos(argv) {
  const resultado = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    const chave = argv[i].slice(2);
    const valor = argv[i + 1];
    resultado[chave] = valor && !valor.startsWith("--") ? valor : "true";
    if (resultado[chave] !== "true") i += 1;
  }
  return resultado;
}

function lista(valor) {
  return valor
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function senhaAleatoria() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}

function erro(mensagem) {
  console.error(`\n${mensagem}\n`);
  process.exit(1);
}
