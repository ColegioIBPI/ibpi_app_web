"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb, getAdminStorage } from "@/core/firebase/admin";
import {
  avisoSchema,
  chaveDoDestino,
  COLECOES,
  destinoSchema,
  type Anexo,
  type Aviso,
} from "@/core/modelo";
import { podePublicarPara } from "@/features/avisos/domain/destinatarios";
import { ANEXOS_POR_AVISO, validarAnexo } from "@/features/avisos/domain/anexo";

/**
 * Publicação de avisos.
 *
 * Permissão e escopo são verificados separadamente: o perfil diz se pode
 * publicar, `podePublicarPara` diz para quem. Professor publica para as
 * turmas dele; financeiro, para uma família.
 */

export interface ResultadoDoAviso {
  ok: boolean;
  erro?: string;
  id?: string;
}

const formularioSchema = z.object({
  titulo: z.string().trim().min(3, "Informe um título"),
  corpo: z.string().trim().min(1, "Escreva o aviso"),
  destino: destinoSchema,
});

export type FormularioDeAviso = z.infer<typeof formularioSchema>;

export async function publicarAviso(
  dados: FormularioDeAviso,
  anexos: FormData | null,
): Promise<ResultadoDoAviso> {
  const sessao = await exigirPermissao("avisos", "lancar");

  const formulario = formularioSchema.safeParse(dados);
  if (!formulario.success) {
    return { ok: false, erro: formulario.error.issues[0]?.message };
  }

  const permissao = podePublicarPara(
    sessao.role,
    formulario.data.destino,
    await turmasDoProfessor(sessao.uid, sessao.role),
  );

  if (!permissao.ok) return { ok: false, erro: permissao.erro };

  const db = getAdminDb();
  const referencia = db.collection(COLECOES.avisos).doc();

  const arquivos = (anexos?.getAll("anexos") ?? []).filter(
    (item): item is File => item instanceof File && item.size > 0,
  );

  if (arquivos.length > ANEXOS_POR_AVISO) {
    return {
      ok: false,
      erro: `No máximo ${ANEXOS_POR_AVISO} anexos por aviso.`,
    };
  }

  const guardados: Anexo[] = [];
  for (const arquivo of arquivos) {
    const validacao = validarAnexo(arquivo);
    if (!validacao.ok) return { ok: false, erro: validacao.erro };

    guardados.push(await guardarAnexo(referencia.id, arquivo));
  }

  const agora = new Date().toISOString();

  const aviso = avisoSchema.safeParse({
    titulo: formulario.data.titulo,
    corpo: formulario.data.corpo,
    destino: formulario.data.destino,
    chave: chaveDoDestino(formulario.data.destino),
    anexos: guardados,
    publicadoPorUid: sessao.uid,
    publicadoPorNome: sessao.nome,
    publicadoPorPerfil: sessao.role,
    publicadoEm: agora,
    ativo: true,
    origem: "portal",
  });

  if (!aviso.success) {
    return { ok: false, erro: aviso.error.issues[0]?.message };
  }

  await gravarComAuditoria({
    colecao: COLECOES.avisos,
    documentoId: referencia.id,
    antes: null,
    depois: aviso.data,
    autor: sessao,
  });

  revalidatePath("/gestao/avisos");
  revalidatePath("/portal/avisos");
  revalidatePath("/portal");

  return { ok: true, id: referencia.id };
}

/**
 * Tira o aviso do ar sem apagá-lo.
 *
 * O que foi comunicado à comunidade fica registrado: apagar esconderia que
 * a mensagem chegou a existir, e é justamente isso que o colégio precisa
 * poder mostrar depois.
 */
export async function alterarPublicacao(
  id: string,
  ativo: boolean,
): Promise<ResultadoDoAviso> {
  const sessao = await exigirPermissao("avisos", "lancar");

  const db = getAdminDb();
  const atual = await db.collection(COLECOES.avisos).doc(id).get();

  if (!atual.exists) return { ok: false, erro: "Aviso não encontrado." };

  const aviso = atual.data() as Aviso;

  // Quem só lança mexe no que publicou; quem gerencia mexe em qualquer um.
  const gerencia =
    sessao.role === "secretaria" || sessao.role === "coordenacao";
  if (!gerencia && aviso.publicadoPorUid !== sessao.uid) {
    return { ok: false, erro: "Este aviso foi publicado por outra pessoa." };
  }

  await gravarComAuditoria({
    colecao: COLECOES.avisos,
    documentoId: id,
    antes: aviso,
    depois: { ativo },
    autor: sessao,
  });

  revalidatePath("/gestao/avisos");
  revalidatePath(`/gestao/avisos/${id}`);
  revalidatePath("/portal/avisos");
  revalidatePath("/portal");

  return { ok: true, id };
}

async function guardarAnexo(avisoId: string, arquivo: File): Promise<Anexo> {
  // O nome original entra no caminho já saneado: nome de arquivo vindo do
  // navegador pode trazer barra e tentar escapar da pasta.
  const nome = arquivo.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120);
  const path = `avisos/${avisoId}/${Date.now()}-${nome}`;

  await getAdminStorage()
    .bucket()
    .file(path)
    .save(Buffer.from(await arquivo.arrayBuffer()), {
      contentType: arquivo.type,
      metadata: { cacheControl: "private, max-age=0, no-store" },
    });

  return { path, nome, tipo: arquivo.type, tamanho: arquivo.size };
}

async function turmasDoProfessor(uid: string, role: string): Promise<string[]> {
  if (role !== "professor") return [];

  const doc = await getAdminDb().collection(COLECOES.users).doc(uid).get();
  const turmas = doc.data()?.turmas;

  return Array.isArray(turmas)
    ? turmas.filter((t): t is string => typeof t === "string")
    : [];
}
