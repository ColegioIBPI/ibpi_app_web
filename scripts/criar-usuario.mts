/**
 * Cria (ou atualiza) uma conta de acesso ao Portal, pela linha de comando.
 *
 *   npm run criar:usuario -- --email alguem@ibpi.com.br --nome "Fulano" --perfil secretaria
 *
 * Opções por perfil:
 *   --matricula 1001            aluno: a matrícula dele
 *   --alunos 1001,1002          responsável: matrículas dos filhos
 *   --turmas 2026-EM1A          professor: turmas que leciona
 *   --senha "..."               define a senha direto (só para conta de teste)
 *
 * A lógica é a mesma da tela da secretaria (`@/core/auth/contas`) — o script
 * existe para o primeiro acesso, quando ainda não há ninguém para usar a
 * tela, e para conta de teste.
 */

import { ROLES, type Role } from "@/core/auth/roles";
import { criarOuAtualizarConta, gerarLinkDeSenha } from "@/core/auth/contas";

const args = lerArgumentos(process.argv.slice(2));

const email = args.email?.trim();
const nome = args.nome?.trim();
const perfil = args.perfil?.trim();

if (!email || !nome || !perfil) {
  erro("Informe --email, --nome e --perfil.");
}

if (!(ROLES as readonly string[]).includes(perfil!)) {
  erro(`Perfil inválido: ${perfil}. Use um de: ${ROLES.join(", ")}.`);
}

if (args.senha && args.senha.length < 8) {
  erro("A senha precisa ter pelo menos 8 caracteres.");
}

const conta = await criarOuAtualizarConta({
  email: email!,
  nome: nome!,
  role: perfil as Role,
  matricula: args.matricula ?? null,
  alunosVinculados: args.alunos ? lista(args.alunos) : undefined,
  turmas: args.turmas ? lista(args.turmas) : undefined,
  senha: args.senha,
});

console.log(
  `\n${conta.nova ? "Conta criada" : "Conta já existia"}: ${conta.email}`,
);
console.log(`  uid:    ${conta.uid}`);
console.log(`  perfil: ${perfil}`);

if (args.senha) {
  console.log("\n  Senha definida pelo parâmetro --senha.");
} else {
  console.log("\n  Abra este link para criar a senha:\n");
  console.log(`  ${await gerarLinkDeSenha(conta.email)}`);
}

console.log("\nDepois é só entrar em /login.\n");

function lerArgumentos(argv: string[]): Record<string, string> {
  const resultado: Record<string, string> = {};

  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;

    const chave = argv[i].slice(2);
    const valor = argv[i + 1];
    resultado[chave] = valor && !valor.startsWith("--") ? valor : "true";
    if (resultado[chave] !== "true") i += 1;
  }

  return resultado;
}

function lista(valor: string): string[] {
  return valor
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function erro(mensagem: string): never {
  console.error(`\n${mensagem}\n`);
  process.exit(1);
}
