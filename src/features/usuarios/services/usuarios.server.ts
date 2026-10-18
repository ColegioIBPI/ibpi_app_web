import "server-only";

import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type UsuarioComId } from "@/core/modelo";
import { ordenarUsuarios } from "@/features/usuarios/domain/administracao";

/**
 * Leitura das contas de acesso.
 *
 * Sem recorte por escopo: quem chega a esta tela administra o sistema
 * inteiro, e uma lista parcial de quem tem acesso não responde a pergunta
 * que leva alguém até ela.
 */
export async function listarUsuarios(): Promise<UsuarioComId[]> {
  const docs = await getAdminDb().collection(COLECOES.users).get();

  return ordenarUsuarios(
    docs.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as UsuarioComId),
  );
}

export async function obterUsuario(uid: string): Promise<UsuarioComId | null> {
  const doc = await getAdminDb().collection(COLECOES.users).doc(uid).get();

  return doc.exists ? ({ id: doc.id, ...doc.data() } as UsuarioComId) : null;
}
