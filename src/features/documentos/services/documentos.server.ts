import "server-only";

import { ordenarPorOrdem } from "@/core/lib/ordem";
import { COLECOES, type DocumentoSolicitavel } from "@/core/modelo";
import { getAdminDb } from "@/core/firebase/admin";

/**
 * Leitura do catálogo de documentos.
 *
 * Não tem escopo de aluno: o catálogo é o mesmo para a escola inteira — o
 * que a secretaria emite não depende de quem pergunta.
 */

export interface DocumentoComId extends DocumentoSolicitavel {
  id: string;
}

/** Tudo que existe no catálogo — visão da secretaria. */
export async function listarDocumentos(): Promise<DocumentoComId[]> {
  const docs = await getAdminDb()
    .collection(COLECOES.documentosSolicitaveis)
    .get();

  return ordenarPorOrdem(
    docs.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as DocumentoSolicitavel),
    })),
    (documento) => documento.nome,
  );
}

/** Só o que a família pode pedir hoje. */
export async function listarDocumentosAtivos(): Promise<DocumentoComId[]> {
  return (await listarDocumentos()).filter((documento) => documento.ativo);
}

export async function obterDocumento(
  id: string,
): Promise<DocumentoComId | null> {
  const doc = await getAdminDb()
    .collection(COLECOES.documentosSolicitaveis)
    .doc(id)
    .get();

  return doc.exists
    ? { id: doc.id, ...(doc.data() as DocumentoSolicitavel) }
    : null;
}
