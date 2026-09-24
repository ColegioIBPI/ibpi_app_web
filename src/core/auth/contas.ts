import { getAdminAuth, getAdminDb } from "@/core/firebase/admin";
import { COLECOES } from "@/core/modelo";
import type { Role } from "@/core/auth/roles";

/**
 * Criação e atualização de contas de acesso.
 *
 * Usada pela tela da secretaria e pelo script `npm run criar:usuario` — as
 * duas precisam fazer exatamente as mesmas três coisas, e fazer diferente
 * seria a forma mais provável de uma conta nascer pela metade.
 *
 * > Só roda no servidor. Não leva o marcador `server-only` porque o script
 * > de linha de comando também a importa, e aquele pacote falha fora do
 * > runtime de React Server Components. A proteção continua valendo pela
 * > cadeia: este módulo importa `@/core/firebase/admin`, que é `server-only`.
 */

export interface DadosDaConta {
  email: string;
  nome: string;
  role: Role;
  /** Matrícula, quando a conta é de um aluno. */
  matricula?: string | null;
  /** Matrículas dos filhos, quando é de um responsável. */
  alunosVinculados?: string[];
  /** Turmas que leciona, quando é de um professor. */
  turmas?: string[];
  /** Só para conta de teste. Sem ela, a pessoa define a própria senha. */
  senha?: string;
}

export interface ContaCriada {
  uid: string;
  /** `false` quando a conta já existia e foi apenas atualizada. */
  nova: boolean;
  email: string;
}

export async function criarOuAtualizarConta(
  dados: DadosDaConta,
): Promise<ContaCriada> {
  const auth = getAdminAuth();
  const email = dados.email.trim().toLowerCase();
  const nome = dados.nome.trim();

  // Senha aleatória quando não for informada: a conta nasce inacessível até
  // a pessoa usar o link do e-mail e escolher a dela. Assim ninguém da
  // escola chega a conhecer a senha de uma família.
  const senha = dados.senha ?? `${crypto.randomUUID()}${crypto.randomUUID()}`;

  let uid: string;
  let nova = false;

  try {
    const existente = await auth.getUserByEmail(email);
    uid = existente.uid;
    await auth.updateUser(uid, { displayName: nome });
  } catch (causa) {
    if ((causa as { code?: string }).code !== "auth/user-not-found")
      throw causa;

    const criado = await auth.createUser({
      email,
      password: senha,
      displayName: nome,
      emailVerified: false,
    });

    uid = criado.uid;
    nova = true;
  }

  // A claim é o passo que costuma ser esquecido: sem ela a pessoa autentica
  // normalmente e não lê nada, porque é o que as Security Rules enxergam.
  await auth.setCustomUserClaims(uid, { role: dados.role });

  const documento: Record<string, unknown> = {
    nome,
    email,
    role: dados.role,
    ativo: true,
    atualizadoEm: new Date().toISOString(),
  };

  if (dados.matricula) documento.matricula = dados.matricula;
  if (dados.alunosVinculados)
    documento.alunosVinculados = dados.alunosVinculados;
  if (dados.turmas) documento.turmas = dados.turmas;

  await getAdminDb()
    .collection(COLECOES.users)
    .doc(uid)
    .set(documento, { merge: true });

  return { uid, nova, email };
}

/**
 * Mantém em `users` os vínculos que as Security Rules leem.
 *
 * O vínculo mora no cadastro do responsável, mas a regra do Firestore
 * consulta `users/{uid}`. Atualizar só um dos dois deixa a família vendo a
 * tela e recebendo "sem permissão" do banco.
 */
export async function sincronizarVinculosDaConta(
  uid: string,
  alunosVinculados: string[],
): Promise<void> {
  await getAdminDb()
    .collection(COLECOES.users)
    .doc(uid)
    .set(
      { alunosVinculados, atualizadoEm: new Date().toISOString() },
      { merge: true },
    );
}

/**
 * Mantém em `users` as turmas que as Security Rules leem.
 *
 * O escopo do professor vem das alocações, mas a regra do Firestore consulta
 * `users/{uid}.turmas`. Atualizar só a alocação deixaria o professor sem
 * acesso à turma que acabou de receber — ou, pior, com acesso à turma de
 * onde acabou de sair.
 */
export async function sincronizarTurmasDaConta(
  uid: string,
  turmas: string[],
): Promise<void> {
  await getAdminDb()
    .collection(COLECOES.users)
    .doc(uid)
    .set({ turmas, atualizadoEm: new Date().toISOString() }, { merge: true });
}

/** Link para a pessoa definir a própria senha no primeiro acesso. */
export async function gerarLinkDeSenha(email: string): Promise<string> {
  return getAdminAuth().generatePasswordResetLink(email);
}

export interface ResultadoDaSincronizacao {
  ok: boolean;
  erro?: string;
  /** `true` quando o e-mail de login de fato mudou. */
  mudou?: boolean;
}

/**
 * Mantém o e-mail de login igual ao do cadastro.
 *
 * O e-mail do cadastro **é** o login. Trocar um sem o outro deixa a família
 * com o endereço novo na ficha e o antigo na tela de entrada — e o link
 * para criar a senha vai para a caixa errada, que é exatamente onde ninguém
 * vai procurar.
 *
 * Devolve erro em vez de lançar: quem chama está no meio de gravar um
 * cadastro, e perder o cadastro inteiro por causa do e-mail seria pior.
 */
export async function sincronizarEmailDaConta(
  uid: string | null | undefined,
  email: string | null,
): Promise<ResultadoDaSincronizacao> {
  if (!uid || !email) return { ok: true, mudou: false };

  const auth = getAdminAuth();
  const conta = await auth.getUser(uid).catch(() => null);

  if (!conta) return { ok: true, mudou: false };
  if (conta.email === email) return { ok: true, mudou: false };

  try {
    await auth.updateUser(uid, { email, emailVerified: false });
    return { ok: true, mudou: true };
  } catch (causa) {
    const codigo = (causa as { code?: string }).code;

    if (codigo === "auth/email-already-exists") {
      return {
        ok: false,
        erro: `O e-mail ${email} já é login de outra conta. Use outro endereço.`,
      };
    }

    return { ok: false, erro: `Não foi possível trocar o e-mail de acesso.` };
  }
}
