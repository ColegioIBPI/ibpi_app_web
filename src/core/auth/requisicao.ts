import "server-only";

import { sessaoDoBearer } from "@/core/auth/bearer";
import { lerSessao, type SessionUser } from "@/core/auth/session";

/**
 * A sessão de quem chamou, venha do navegador ou do aplicativo.
 *
 * As duas formas de autenticação existem pela natureza de cada cliente: o
 * navegador manda o cookie de sessão sozinho; o aplicativo não tem cookie e
 * manda o token de ID no cabeçalho.
 *
 * O cookie vem primeiro porque é o caso comum e não custa uma viagem ao
 * Firebase. O token só é verificado quando não há cookie.
 *
 * **Toda rota que serve arquivo deve usar esta função**, e não `lerSessao`
 * direto. Foto de aluno, anexo de aviso e comprovante são de menor de
 * idade; servi-los só ao navegador não os torna mais seguros — torna o
 * aplicativo incapaz de mostrá-los, que é um problema diferente e pior,
 * porque a saída fácil vira abrir o bucket.
 */
export async function sessaoDaRequisicao(
  request: Request,
): Promise<SessionUser | null> {
  return (await lerSessao()) ?? (await sessaoDoBearer(request));
}
