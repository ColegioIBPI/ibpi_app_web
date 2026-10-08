import "server-only";

import { getAdminAuth } from "@/core/firebase/admin";
import { lerPerfil, type SessionUser } from "@/core/auth/session";

/**
 * Sessão a partir do token de ID, para quem não tem cookie.
 *
 * O Portal autentica por cookie de sessão, que o navegador manda sozinho. O
 * aplicativo MyIBPI não tem navegador: ele já fez login pelo SDK do Firebase
 * e tem um **token de ID**, que manda no cabeçalho `Authorization`.
 *
 * O perfil e os vínculos vêm sempre do servidor, nunca do token: o token
 * prova **quem** é a pessoa, e o documento em `users` diz o que ela pode.
 * Confiar numa claim arbitrária do token para isso seria confiar no que o
 * cliente mandou.
 */
export async function sessaoDoBearer(
  request: Request,
): Promise<SessionUser | null> {
  const cabecalho = request.headers.get("authorization") ?? "";
  const token = cabecalho.toLowerCase().startsWith("bearer ")
    ? cabecalho.slice(7).trim()
    : null;

  if (!token) return null;

  try {
    // `true` recusa token de conta revogada ou desativada — o mesmo rigor do
    // login pelo Portal.
    const claims = await getAdminAuth().verifyIdToken(token, true);
    const perfil = await lerPerfil(claims.uid, claims.role);

    if (!perfil) return null;

    return {
      uid: claims.uid,
      email: perfil.email ?? claims.email ?? "",
      nome: perfil.nome,
      role: perfil.role,
      matricula: perfil.matricula,
      alunosVinculados: perfil.alunosVinculados,
    };
  } catch {
    // Token expirado, assinatura inválida, conta revogada: para quem chama,
    // tudo isso é a mesma coisa — não há sessão.
    return null;
  }
}
