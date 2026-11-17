"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { corpoDaAuditoria, gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import {
  criarOuAtualizarConta,
  gerarLinkDeSenha,
  sincronizarEmailDaConta,
  sincronizarTurmasDaConta,
} from "@/core/auth/contas";
import { getAdminDb } from "@/core/firebase/admin";
import {
  alocacaoSchema,
  COLECOES,
  professorSchema,
  type Alocacao,
  type Professor,
} from "@/core/modelo";
import {
  normalizarCpf,
  normalizarTelefone,
} from "@/features/migracao/domain/texto";
import {
  chaveDeBusca,
  idDaAlocacao,
  motivoParaNaoCriarAcesso,
  turmasDasAlocacoes,
  verificarDuplicata,
} from "@/features/professores/domain/alocacoes";
import { impedimentoParaTrocar } from "@/features/professores/domain/troca";

/**
 * Cadastro de professores e alocações.
 *
 * A alocação define o **escopo de acesso** do professor, então toda mudança
 * aqui precisa chegar a `users/{uid}.turmas`, que é o que as Security Rules
 * consultam. Atualizar só a alocação deixaria o professor sem acesso à
 * turma que acabou de receber — ou com acesso à turma de onde saiu.
 */

export interface Resultado {
  ok: boolean;
  erro?: string;
  id?: string;
  link?: string;
}

const formularioSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo"),
  email: z.string().trim(),
  telefone: z.string().trim(),
  cpf: z.string().trim(),
  identidade: z.string().trim(),
  codigoInterno: z.string().trim(),
  horario: z.string().trim(),
  observacoes: z.string().trim(),
  ativo: z.boolean(),
});

export type FormularioDeProfessor = z.infer<typeof formularioSchema>;

export async function salvarProfessor(
  idExistente: string | null,
  dados: FormularioDeProfessor,
): Promise<Resultado> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const formulario = formularioSchema.safeParse(dados);
  if (!formulario.success) {
    return { ok: false, erro: formulario.error.issues[0]?.message };
  }

  const dadosLimpos = formulario.data;
  const email = dadosLimpos.email ? dadosLimpos.email.toLowerCase() : null;

  if (email && !z.string().email().safeParse(email).success) {
    return { ok: false, erro: "Esse e-mail não parece válido." };
  }

  const db = getAdminDb();

  // O e-mail vira login: dois professores com o mesmo e-mail seriam a mesma
  // conta, e o segundo herdaria as turmas do primeiro.
  if (email) {
    const conflito = await db
      .collection(COLECOES.professores)
      .where("email", "==", email)
      .get();

    const outro = conflito.docs.find((doc) => doc.id !== idExistente);
    if (outro) {
      return {
        ok: false,
        erro: `O e-mail ${email} já é de ${outro.data().nome}.`,
      };
    }
  }

  const id = idExistente ?? db.collection(COLECOES.professores).doc().id;
  const referencia = db.collection(COLECOES.professores).doc(id);
  const atual = await referencia.get();
  const anterior = atual.data() as Professor | undefined;

  const professor = professorSchema.safeParse({
    nome: dadosLimpos.nome,
    nomeParaBusca: chaveDeBusca(dadosLimpos.nome),
    codigoInterno: dadosLimpos.codigoInterno || null,
    cpf: normalizarCpf(dadosLimpos.cpf),
    identidade: dadosLimpos.identidade || null,
    email,
    telefones: dadosLimpos.telefone
      ? [normalizarTelefone(dadosLimpos.telefone) ?? dadosLimpos.telefone]
      : [],
    horario: dadosLimpos.horario || null,
    observacoes: dadosLimpos.observacoes || null,
    uid: anterior?.uid ?? null,
    // As turmas vêm das alocações, nunca do formulário.
    turmas: anterior?.turmas ?? [],
    ativo: dadosLimpos.ativo,
    origem: anterior?.origem ?? "portal",
  });

  if (!professor.success) {
    return { ok: false, erro: professor.error.issues[0]?.message };
  }

  // O e-mail do cadastro é o login. Trocar um sem o outro deixaria o
  // professor com o endereço novo na ficha e o antigo na tela de entrada.
  const sincronia = await sincronizarEmailDaConta(anterior?.uid, email);
  if (!sincronia.ok) return { ok: false, erro: sincronia.erro };

  await gravarComAuditoria({
    colecao: COLECOES.professores,
    documentoId: id,
    antes: atual.exists ? (atual.data() ?? null) : null,
    depois: professor.data,
    autor: sessao,
  });

  revalidatePath("/gestao/professores");
  revalidatePath(`/gestao/professores/${id}`);

  return { ok: true, id };
}

const alocacaoFormSchema = z.object({
  turmaId: z.string().min(1, "Escolha a turma"),
  turmaCodigo: z.string().min(1),
  disciplinaId: z.string().min(1, "Escolha a disciplina"),
  disciplinaNome: z.string().min(1),
  anoLetivo: z.coerce.number().int().min(2000).max(2100),
});

export type FormularioDeAlocacao = z.infer<typeof alocacaoFormSchema>;

export async function alocarProfessor(
  professorId: string,
  dados: FormularioDeAlocacao,
): Promise<Resultado> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const formulario = alocacaoFormSchema.safeParse(dados);
  if (!formulario.success) {
    return { ok: false, erro: formulario.error.issues[0]?.message };
  }

  const db = getAdminDb();
  const professorDoc = await db
    .collection(COLECOES.professores)
    .doc(professorId)
    .get();

  if (!professorDoc.exists) {
    return { ok: false, erro: "Professor não encontrado." };
  }

  const professor = professorDoc.data() as Professor;
  const existentes = await alocacoesAtuais(professorId);

  const duplicata = verificarDuplicata(existentes, formulario.data);
  if (!duplicata.ok) return { ok: false, erro: duplicata.erro };

  const { turmaId, turmaCodigo, disciplinaId, disciplinaNome, anoLetivo } =
    formulario.data;

  const alocacao = alocacaoSchema.safeParse({
    anoLetivo,
    professorId,
    professorNome: professor.nome,
    turmaId,
    turmaCodigo,
    disciplinaId,
    disciplinaNome,
    ativa: true,
    origem: "portal",
  });

  if (!alocacao.success) {
    return { ok: false, erro: alocacao.error.issues[0]?.message };
  }

  const id = idDaAlocacao(anoLetivo, professorId, turmaId, disciplinaId);
  const anterior = await db.collection(COLECOES.alocacoes).doc(id).get();

  await gravarComAuditoria({
    colecao: COLECOES.alocacoes,
    documentoId: id,
    antes: anterior.exists ? (anterior.data() ?? null) : null,
    depois: alocacao.data,
    autor: sessao,
  });

  await propagarTurmas(professorId, professor.uid ?? null, sessao.uid);

  revalidatePath(`/gestao/professores/${professorId}`);
  revalidatePath("/gestao/professores");

  return { ok: true, id };
}

/**
 * Troca o professor de uma disciplina, numa gravação só.
 *
 * Era feito em dois passos à mão, e a **ordem importava**: desvincular
 * antes de vincular tirava a disciplina da grade e a sumia do boletim até
 * o vínculo novo entrar. Nada se perdia, mas assustava quem estava
 * olhando — e documentar a ordem certa resolve menos que não exigir ordem
 * nenhuma.
 *
 * As duas alocações mudam **no mesmo lote**, por isso a auditoria é
 * montada à mão com `corpoDaAuditoria` em vez de duas chamadas a
 * `gravarComAuditoria`: cada uma commitaria o seu lote, e uma falha entre
 * elas deixaria a turma com dois professores ativos ou com nenhum.
 *
 * A propagação de escopo vem depois, e **o professor que sai vem
 * primeiro**: das duas, é a que tem consequência de acesso.
 */
export async function trocarProfessor(
  alocacaoId: string,
  novoProfessorId: string,
): Promise<Resultado> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const db = getAdminDb();
  const atualDoc = await db.collection(COLECOES.alocacoes).doc(alocacaoId).get();

  if (!atualDoc.exists) return { ok: false, erro: "Vínculo não encontrado." };

  const atual = atualDoc.data() as Alocacao;

  const [novoDoc, antigoDoc] = await Promise.all([
    db.collection(COLECOES.professores).doc(novoProfessorId).get(),
    db.collection(COLECOES.professores).doc(atual.professorId).get(),
  ]);

  const novo = novoDoc.exists ? (novoDoc.data() as Professor) : null;

  const impedimento = impedimentoParaTrocar(atual, novoProfessorId, novo);
  if (impedimento) return { ok: false, erro: impedimento };

  const nova = alocacaoSchema.safeParse({
    ...atual,
    professorId: novoProfessorId,
    professorNome: novo!.nome,
    ativa: true,
    origem: "portal",
  });

  if (!nova.success) {
    return { ok: false, erro: nova.error.issues[0]?.message };
  }

  const novaId = idDaAlocacao(
    atual.anoLetivo,
    novoProfessorId,
    atual.turmaId,
    atual.disciplinaId,
  );

  // Pode já existir, desativada: é a troca de volta, ou o professor que
  // deu a disciplina no primeiro trimestre e a retoma no terceiro. Nesse
  // caso o diário dele volta a ser o diário corrente, e é o certo.
  const novaAnterior = await db.collection(COLECOES.alocacoes).doc(novaId).get();

  const agora = new Date().toISOString();
  const lote = db.batch();

  lote.set(
    db.collection(COLECOES.alocacoes).doc(novaId),
    { ...nova.data, atualizadoEm: agora, atualizadoPor: sessao.uid },
    { merge: true },
  );

  lote.set(
    db.collection(COLECOES.auditoria).doc(),
    corpoDaAuditoria({
      colecao: COLECOES.alocacoes,
      documentoId: novaId,
      acao: novaAnterior.exists ? "alterou" : "criou",
      alteracoes: {
        professorId: { de: atual.professorId, para: novoProfessorId },
        ativa: { de: novaAnterior.data()?.ativa ?? null, para: true },
      },
      autor: sessao,
      em: agora,
    }),
  );

  lote.set(
    db.collection(COLECOES.alocacoes).doc(alocacaoId),
    { ativa: false, atualizadoEm: agora, atualizadoPor: sessao.uid },
    { merge: true },
  );

  lote.set(
    db.collection(COLECOES.auditoria).doc(),
    corpoDaAuditoria({
      colecao: COLECOES.alocacoes,
      documentoId: alocacaoId,
      acao: "alterou",
      alteracoes: { ativa: { de: true, para: false } },
      autor: sessao,
      em: agora,
    }),
  );

  await lote.commit();

  // O que sai primeiro: perder acesso tem consequência, ganhar não.
  await propagarTurmas(
    atual.professorId,
    (antigoDoc.data() as Professor | undefined)?.uid ?? null,
    sessao.uid,
  );
  await propagarTurmas(novoProfessorId, novo!.uid ?? null, sessao.uid);

  revalidatePath("/gestao/configuracoes/vinculos");
  revalidatePath(`/gestao/professores/${atual.professorId}`);
  revalidatePath(`/gestao/professores/${novoProfessorId}`);
  revalidatePath("/gestao/professores");

  return { ok: true, id: novaId };
}

export async function removerAlocacao(
  professorId: string,
  alocacaoId: string,
): Promise<Resultado> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const db = getAdminDb();
  const atual = await db.collection(COLECOES.alocacoes).doc(alocacaoId).get();

  if (!atual.exists) return { ok: false, erro: "Alocação não encontrada." };

  // Desativa em vez de apagar: o diário de classe e as notas lançadas
  // apontam para esta alocação, e apagá-la deixaria o histórico órfão.
  await gravarComAuditoria({
    colecao: COLECOES.alocacoes,
    documentoId: alocacaoId,
    antes: atual.data() ?? null,
    depois: { ativa: false },
    autor: sessao,
  });

  const professor = (
    await db.collection(COLECOES.professores).doc(professorId).get()
  ).data() as Professor | undefined;

  await propagarTurmas(professorId, professor?.uid ?? null, sessao.uid);

  revalidatePath(`/gestao/professores/${professorId}`);
  revalidatePath("/gestao/professores");

  return { ok: true, id: alocacaoId };
}

export async function criarAcessoDoProfessor(
  professorId: string,
): Promise<Resultado> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const db = getAdminDb();
  const doc = await db.collection(COLECOES.professores).doc(professorId).get();

  if (!doc.exists) return { ok: false, erro: "Professor não encontrado." };

  const professor = doc.data() as Professor;
  const impedimento = motivoParaNaoCriarAcesso({
    nome: professor.nome,
    email: professor.email,
    uid: professor.uid,
    turmas: professor.turmas ?? [],
    ativo: professor.ativo,
  });

  if (impedimento) return { ok: false, erro: impedimento };

  const conta = await criarOuAtualizarConta({
    email: professor.email!,
    nome: professor.nome,
    role: "professor",
    turmas: professor.turmas ?? [],
  });

  await gravarComAuditoria({
    colecao: COLECOES.professores,
    documentoId: professorId,
    antes: professor,
    depois: { uid: conta.uid },
    autor: sessao,
  });

  revalidatePath(`/gestao/professores/${professorId}`);

  return {
    ok: true,
    id: professorId,
    link: await gerarLinkDeSenha(conta.email),
  };
}

async function alocacoesAtuais(professorId: string): Promise<Alocacao[]> {
  const docs = await getAdminDb()
    .collection(COLECOES.alocacoes)
    .where("professorId", "==", professorId)
    .get();

  return docs.docs.map((doc) => doc.data() as Alocacao);
}

/**
 * Recalcula as turmas do professor e grava nos dois lugares que importam.
 *
 * `professores/{id}.turmas` é o que a tela mostra; `users/{uid}.turmas` é o
 * que as Security Rules leem. Deixar um dos dois para trás produz o pior
 * tipo de bug: a tela diz uma coisa e o banco faz outra.
 */
async function propagarTurmas(
  professorId: string,
  uid: string | null,
  autorUid: string,
): Promise<void> {
  const turmas = turmasDasAlocacoes(await alocacoesAtuais(professorId));
  const agora = new Date().toISOString();

  await getAdminDb()
    .collection(COLECOES.professores)
    .doc(professorId)
    .set(
      { turmas, atualizadoEm: agora, atualizadoPor: autorUid },
      { merge: true },
    );

  if (uid) await sincronizarTurmasDaConta(uid, turmas);
}
