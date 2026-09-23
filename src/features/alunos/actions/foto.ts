"use server";

import { revalidatePath } from "next/cache";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES } from "@/core/modelo";
import { caminhoDaFoto, validarFoto } from "@/features/alunos/domain/foto";
import {
  gravarFoto,
  removerFoto,
} from "@/features/alunos/services/foto.server";

/**
 * Envio e remoção da foto do aluno.
 *
 * Só secretaria e coordenação — é o mesmo nível exigido para editar o
 * cadastro, porque a foto é parte dele.
 */

export interface ResultadoDaFoto {
  ok: boolean;
  erro?: string;
  /** Marca de tempo da nova foto, para a tela furar o cache. */
  versao?: string;
}

export async function enviarFotoDoAluno(
  matricula: string,
  dados: FormData,
): Promise<ResultadoDaFoto> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const arquivo = dados.get("foto");
  if (!(arquivo instanceof File)) {
    return { ok: false, erro: "Escolha uma imagem." };
  }

  const validacao = validarFoto(arquivo);
  if (!validacao.ok) return { ok: false, erro: validacao.erro };

  const db = getAdminDb();
  const referencia = db.collection(COLECOES.alunos).doc(matricula);
  const atual = await referencia.get();

  if (!atual.exists) return { ok: false, erro: "Aluno não encontrado." };

  let path: string;
  try {
    ({ path } = await gravarFoto(matricula, await arquivo.arrayBuffer()));
  } catch {
    // Arquivo com extensão de imagem mas conteúdo de outra coisa falha no
    // reencode — e é aqui que ele para, antes de virar um objeto no bucket.
    return {
      ok: false,
      erro: "Não foi possível ler a imagem. Tente outro arquivo.",
    };
  }

  const versao = new Date().toISOString();

  await gravarComAuditoria({
    colecao: COLECOES.alunos,
    documentoId: matricula,
    antes: atual.data() ?? null,
    depois: { fotoPath: path, fotoAtualizadaEm: versao },
    autor: sessao,
  });

  revalidatePath(`/gestao/alunos/${matricula}`);
  revalidatePath(`/gestao/alunos/${matricula}/editar`);

  return { ok: true, versao };
}

export async function removerFotoDoAluno(
  matricula: string,
): Promise<ResultadoDaFoto> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const db = getAdminDb();
  const referencia = db.collection(COLECOES.alunos).doc(matricula);
  const atual = await referencia.get();

  if (!atual.exists) return { ok: false, erro: "Aluno não encontrado." };

  // Remove o arquivo antes do registro: sobrar uma foto no bucket sem
  // referência no cadastro é dado pessoal guardado sem ninguém saber.
  await removerFoto(
    (atual.data()?.fotoPath as string) ?? caminhoDaFoto(matricula),
  );

  await gravarComAuditoria({
    colecao: COLECOES.alunos,
    documentoId: matricula,
    antes: atual.data() ?? null,
    depois: { fotoPath: null, fotoAtualizadaEm: null },
    autor: sessao,
  });

  revalidatePath(`/gestao/alunos/${matricula}`);
  revalidatePath(`/gestao/alunos/${matricula}/editar`);

  return { ok: true };
}
