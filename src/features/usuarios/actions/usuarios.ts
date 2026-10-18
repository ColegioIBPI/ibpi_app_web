"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { criarOuAtualizarConta, gerarLinkDeSenha } from "@/core/auth/contas";
import { exigirPermissao } from "@/core/auth/guards";
import { ROLES } from "@/core/auth/roles";
import { getAdminAuth, getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type Usuario } from "@/core/modelo";
import {
  impedimentoParaSuspender,
  impedimentoParaTrocarPapel,
} from "@/features/usuarios/domain/administracao";
import { listarUsuarios } from "@/features/usuarios/services/usuarios.server";

/**
 * Administração das contas de acesso.
 *
 * Trocar papel é `usuarios: gerenciar` — só a administração. Suspender é
 * `lancar`, que a secretaria também tem: ela precisa cortar o acesso do
 * professor que saiu hoje sem esperar ninguém.
 */

export interface ResultadoDoUsuario {
  ok: boolean;
  erro?: string;
  link?: string;
}

function revalidar() {
  revalidatePath("/gestao/usuarios");
}

const papelSchema = z.object({
  uid: z.string().min(1),
  role: z.enum(ROLES),
});

export async function alterarPapel(
  dados: z.infer<typeof papelSchema>,
): Promise<ResultadoDoUsuario> {
  const entrada = papelSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("usuarios", "gerenciar");

  const usuarios = await listarUsuarios();
  const alvo = usuarios.find((usuario) => usuario.id === entrada.data.uid);

  if (!alvo) return { ok: false, erro: "Conta não encontrada." };

  const impedimento = impedimentoParaTrocarPapel(
    sessao.uid,
    alvo,
    entrada.data.role,
    usuarios,
  );

  if (impedimento) return { ok: false, erro: impedimento.motivo };

  /**
   * A claim vem **antes** do documento.
   *
   * É ela que as Security Rules leem. Se o documento mudasse primeiro e a
   * claim falhasse, a tela diria "professor" e o banco continuaria tratando
   * a pessoa como administração — o sentido errado do erro.
   */
  await getAdminAuth().setCustomUserClaims(entrada.data.uid, {
    role: entrada.data.role,
  });

  // O token velho carrega a claim velha por até uma hora. Revogar força a
  // pessoa a entrar de novo e receber o papel que ela de fato tem agora.
  await getAdminAuth().revokeRefreshTokens(entrada.data.uid);

  await gravarComAuditoria({
    colecao: COLECOES.users,
    documentoId: entrada.data.uid,
    antes: alvo as unknown as Record<string, unknown>,
    depois: { role: entrada.data.role },
    autor: sessao,
  });

  revalidar();

  return { ok: true };
}

const suspensaoSchema = z.object({
  uid: z.string().min(1),
  ativo: z.boolean(),
});

/**
 * Suspende ou devolve o acesso.
 *
 * **Mexe no Firebase Auth, e não só no documento.** A sessão do Portal já
 * recusava quem tem `ativo: false`, mas o aplicativo lê o Firestore direto
 * com o próprio token e nunca passa por ela — uma conta "suspensa" só no
 * documento continuaria funcionando no celular da pessoa.
 *
 * Desativar no Auth e revogar os tokens fecha os dois caminhos de uma vez.
 */
export async function alternarAcesso(
  dados: z.infer<typeof suspensaoSchema>,
): Promise<ResultadoDoUsuario> {
  const entrada = suspensaoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("usuarios", "lancar");

  const usuarios = await listarUsuarios();
  const alvo = usuarios.find((usuario) => usuario.id === entrada.data.uid);

  if (!alvo) return { ok: false, erro: "Conta não encontrada." };

  if (!entrada.data.ativo) {
    const impedimento = impedimentoParaSuspender(sessao.uid, alvo, usuarios);
    if (impedimento) return { ok: false, erro: impedimento.motivo };
  }

  await getAdminAuth().updateUser(entrada.data.uid, {
    disabled: !entrada.data.ativo,
  });

  if (!entrada.data.ativo) {
    await getAdminAuth().revokeRefreshTokens(entrada.data.uid);
  }

  await gravarComAuditoria({
    colecao: COLECOES.users,
    documentoId: entrada.data.uid,
    antes: alvo as unknown as Record<string, unknown>,
    depois: { ativo: entrada.data.ativo },
    autor: sessao,
  });

  revalidar();

  return { ok: true };
}

/**
 * Gera o link para a pessoa definir a própria senha.
 *
 * Devolvido para a tela **copiar**, em vez de disparar e-mail: o Portal não
 * manda e-mail, e quem atende costuma estar com a pessoa ao telefone. O
 * link é de uso único e expira.
 */
export async function linkDeSenha(uid: string): Promise<ResultadoDoUsuario> {
  await exigirPermissao("usuarios", "lancar");

  const doc = await getAdminDb().collection(COLECOES.users).doc(uid).get();
  if (!doc.exists) return { ok: false, erro: "Conta não encontrada." };

  const usuario = doc.data() as Usuario;

  try {
    return { ok: true, link: await gerarLinkDeSenha(usuario.email) };
  } catch {
    return {
      ok: false,
      erro: "Não foi possível gerar o link. Confira o e-mail da conta.",
    };
  }
}

const novaContaSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo"),
  email: z.string().trim().email("E-mail inválido"),
  role: z.enum(ROLES),
});

/**
 * Cria uma conta de equipe.
 *
 * Conta de **família** não nasce aqui: ela vem do cadastro do responsável
 * ou do aluno, onde o vínculo com as matrículas é feito junto. Criada
 * solta, a pessoa entraria e não veria nada — e é exatamente a reclamação
 * que a tela de usuários existe para evitar.
 */
export async function criarContaDeEquipe(
  dados: z.infer<typeof novaContaSchema>,
): Promise<ResultadoDoUsuario> {
  const entrada = novaContaSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("usuarios", "gerenciar");

  if (entrada.data.role === "aluno" || entrada.data.role === "responsavel") {
    return {
      ok: false,
      erro: "Conta de família é criada no cadastro do aluno ou do responsável, onde o vínculo é feito.",
    };
  }

  try {
    const conta = await criarOuAtualizarConta({
      nome: entrada.data.nome,
      email: entrada.data.email,
      role: entrada.data.role,
    });

    await gravarComAuditoria({
      colecao: COLECOES.users,
      documentoId: conta.uid,
      antes: null,
      depois: {
        nome: entrada.data.nome,
        email: entrada.data.email,
        role: entrada.data.role,
        ativo: true,
      },
      autor: sessao,
    });

    revalidar();

    return { ok: true, link: await gerarLinkDeSenha(conta.email) };
  } catch {
    return { ok: false, erro: "Não foi possível criar a conta." };
  }
}
