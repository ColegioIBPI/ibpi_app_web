"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import {
  criarOuAtualizarConta,
  gerarLinkDeSenha,
  sincronizarEmailDaConta,
  sincronizarVinculosDaConta,
} from "@/core/auth/contas";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, responsavelSchema, type Responsavel } from "@/core/modelo";
import {
  normalizarCpf,
  normalizarTelefone,
} from "@/features/migracao/domain/texto";
import { podeCriarConta } from "@/features/responsaveis/domain/busca";
import { sincronizarChavesDeAviso } from "@/features/avisos/services/chaves.server";

/**
 * Cadastro de responsáveis, vínculo com alunos e criação do acesso.
 *
 * Tudo aqui é privilégio de secretaria e coordenação. O Admin SDK ignora as
 * Security Rules, então o perfil é verificado em cada ação.
 */

export interface Resultado {
  ok: boolean;
  erro?: string;
  id?: string;
  /** Link de definição de senha, quando uma conta é criada. */
  link?: string;
  /** `true` quando a troca de e-mail no cadastro mudou também o login. */
  emailDeAcessoMudou?: boolean;
}

const formularioSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo"),
  parentesco: z.string().trim(),
  email: z.string().trim(),
  telefone: z.string().trim(),
  cpf: z.string().trim(),
  ativo: z.boolean(),
});

export type FormularioDeResponsavel = z.infer<typeof formularioSchema>;

export async function salvarResponsavel(
  idExistente: string | null,
  dados: FormularioDeResponsavel,
): Promise<Resultado> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const formulario = formularioSchema.safeParse(dados);
  if (!formulario.success) {
    return { ok: false, erro: formulario.error.issues[0]?.message };
  }

  const { nome, parentesco, email, telefone, cpf, ativo } = formulario.data;
  const emailLimpo = email ? email.toLowerCase() : null;

  if (emailLimpo && !z.string().email().safeParse(emailLimpo).success) {
    return { ok: false, erro: "Esse e-mail não parece válido." };
  }

  const db = getAdminDb();

  // O e-mail é o que vira login: dois responsáveis com o mesmo e-mail
  // seriam a mesma conta, e a segunda sobrescreveria os vínculos da
  // primeira. Foi por essa chave que a migração consolidou irmãos.
  if (emailLimpo) {
    const conflito = await db
      .collection(COLECOES.responsaveis)
      .where("email", "==", emailLimpo)
      .get();

    const outro = conflito.docs.find((doc) => doc.id !== idExistente);
    if (outro) {
      return {
        ok: false,
        erro: `O e-mail ${emailLimpo} já é de ${outro.data().nome}.`,
      };
    }
  }

  const id = idExistente ?? idDeResponsavel(emailLimpo, cpf, nome);
  const referencia = db.collection(COLECOES.responsaveis).doc(id);
  const atual = await referencia.get();

  if (!idExistente && atual.exists) {
    return {
      ok: false,
      erro: `Já existe o responsável ${atual.data()?.nome}.`,
    };
  }

  const anterior = atual.data() as Responsavel | undefined;

  const responsavel = responsavelSchema.safeParse({
    nome,
    parentesco: parentesco || null,
    email: emailLimpo,
    telefone: normalizarTelefone(telefone) ?? (telefone || null),
    cpf: normalizarCpf(cpf),
    // O vínculo não é editado por este formulário — tem ação própria.
    alunosVinculados: anterior?.alunosVinculados ?? [],
    uid: anterior?.uid ?? null,
    ativo,
    origem: anterior?.origem ?? "portal",
  });

  if (!responsavel.success) {
    return { ok: false, erro: responsavel.error.issues[0]?.message };
  }

  // O e-mail do cadastro é o login. Sincronizar antes de gravar: se a troca
  // for recusada, o cadastro não pode ficar apontando para um endereço que
  // a pessoa não usa para entrar.
  const sincronia = await sincronizarEmailDaConta(anterior?.uid, emailLimpo);
  if (!sincronia.ok) return { ok: false, erro: sincronia.erro };

  await gravarComAuditoria({
    colecao: COLECOES.responsaveis,
    documentoId: id,
    antes: atual.exists ? (atual.data() ?? null) : null,
    depois: responsavel.data,
    autor: sessao,
  });

  revalidatePath("/gestao/responsaveis");
  revalidatePath(`/gestao/responsaveis/${id}`);

  return { ok: true, id, emailDeAcessoMudou: sincronia.mudou };
}

/**
 * Gera de novo o link para a família criar a senha.
 *
 * Existe porque o e-mail se perde: cai no spam, o endereço estava errado,
 * ou a família apagou. Sem isso, a secretaria não tinha como ajudar — a
 * conta ficava criada e inacessível.
 */
export async function reenviarAcessoDoResponsavel(
  id: string,
): Promise<Resultado & { email?: string }> {
  await exigirPermissao("cadastros", "gerenciar");

  const doc = await getAdminDb().collection(COLECOES.responsaveis).doc(id).get();

  if (!doc.exists) return { ok: false, erro: "Responsável não encontrado." };

  const dados = doc.data() as Responsavel;

  if (!dados.uid) return { ok: false, erro: "Este responsável ainda não tem acesso." };
  if (!dados.email) return { ok: false, erro: "Cadastre um e-mail primeiro." };

  return {
    ok: true,
    id,
    email: dados.email,
    link: await gerarLinkDeSenha(dados.email),
  };
}

/** Vincula ou desvincula um aluno do responsável. */
export async function alterarVinculo(
  id: string,
  matricula: string,
  acao: "vincular" | "desvincular",
): Promise<Resultado> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const db = getAdminDb();
  const referencia = db.collection(COLECOES.responsaveis).doc(id);
  const atual = await referencia.get();

  if (!atual.exists) return { ok: false, erro: "Responsável não encontrado." };

  const dados = atual.data() as Responsavel;
  const vinculos = new Set(dados.alunosVinculados ?? []);

  if (acao === "vincular") {
    const aluno = await db.collection(COLECOES.alunos).doc(matricula).get();
    if (!aluno.exists) {
      return {
        ok: false,
        erro: `Não existe o aluno de matrícula ${matricula}.`,
      };
    }
    vinculos.add(matricula);
  } else {
    vinculos.delete(matricula);
  }

  const alunosVinculados = [...vinculos].sort();

  await gravarComAuditoria({
    colecao: COLECOES.responsaveis,
    documentoId: id,
    antes: dados,
    depois: { alunosVinculados },
    autor: sessao,
  });

  // O vínculo também vive em `users/{uid}`, que é o que as Security Rules
  // consultam. Atualizar só o cadastro deixaria a família vendo a tela e
  // recebendo "sem permissão" do banco.
  if (dados.uid) {
    await sincronizarVinculosDaConta(dados.uid, alunosVinculados);

    // As chaves de aviso saem dos filhos: ganhar ou perder um filho muda a
    // turma e o segmento que alcançam esta família.
    await sincronizarChavesDeAviso({
      uid: dados.uid,
      role: "responsavel",
      alunosVinculados,
    });
  }

  revalidatePath(`/gestao/responsaveis/${id}`);
  revalidatePath("/gestao/responsaveis");

  return { ok: true, id };
}

/**
 * Cria a conta de acesso do responsável.
 *
 * Devolve o link de definição de senha. O e-mail é disparado pela tela, pelo
 * SDK cliente — o Admin SDK gera o link, mas não envia; enviar do servidor
 * exigiria um serviço de e-mail que o projeto não tem.
 */
export async function criarAcessoDoResponsavel(id: string): Promise<Resultado> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const db = getAdminDb();
  const referencia = db.collection(COLECOES.responsaveis).doc(id);
  const atual = await referencia.get();

  if (!atual.exists) return { ok: false, erro: "Responsável não encontrado." };

  const dados = atual.data() as Responsavel;

  if (
    !podeCriarConta({
      ...dados,
      alunosVinculados: dados.alunosVinculados ?? [],
    })
  ) {
    return {
      ok: false,
      erro: dados.uid
        ? "Este responsável já tem acesso."
        : "Cadastre um e-mail e vincule ao menos um aluno antes de criar o acesso.",
    };
  }

  const conta = await criarOuAtualizarConta({
    email: dados.email!,
    nome: dados.nome,
    role: "responsavel",
    alunosVinculados: dados.alunosVinculados ?? [],
  });

  await gravarComAuditoria({
    colecao: COLECOES.responsaveis,
    documentoId: id,
    antes: dados,
    depois: { uid: conta.uid },
    autor: sessao,
  });

  await sincronizarChavesDeAviso({
    uid: conta.uid,
    role: "responsavel",
    alunosVinculados: dados.alunosVinculados ?? [],
  });

  revalidatePath(`/gestao/responsaveis/${id}`);

  return { ok: true, id, link: await gerarLinkDeSenha(conta.email) };
}

/**
 * Identidade do responsável, na mesma ordem que a migração usou: e-mail,
 * depois CPF, depois nome. Manter a regra igual evita que o mesmo
 * responsável entre de novo com outro id.
 */
function idDeResponsavel(
  email: string | null,
  cpf: string,
  nome: string,
): string {
  const cpfLimpo = normalizarCpf(cpf);
  const chave = email
    ? `email:${email}`
    : cpfLimpo
      ? `cpf:${cpfLimpo}`
      : `nome:${nome}`;

  return chave
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 120);
}
