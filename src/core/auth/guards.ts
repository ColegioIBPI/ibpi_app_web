import "server-only";

import { redirect } from "next/navigation";

import { lerSessao, type SessionUser } from "@/core/auth/session";
import { pode, rotaInicial, type Nivel, type Recurso } from "@/core/auth/roles";

/**
 * Guardas de rota do lado do servidor.
 *
 * O `proxy.ts` só confere se existe cookie — é a primeira barreira, barata e
 * rápida. Estas funções são a barreira que vale: verificam assinatura,
 * revogação e perfil antes de qualquer dado ser lido.
 */

/** Exige sessão válida. Sem ela, manda para o login guardando o destino. */
export async function exigirSessao(destino?: string): Promise<SessionUser> {
  const sessao = await lerSessao();

  if (!sessao) {
    const parametro = destino
      ? `?continuar=${encodeURIComponent(destino)}`
      : "";
    redirect(`/login${parametro}`);
  }

  return sessao;
}

/**
 * Exige sessão e permissão no recurso.
 *
 * Quem não tem permissão é devolvido para a própria área inicial, em vez de
 * ver uma tela de erro: para o usuário, o link simplesmente não era para ele.
 */
export async function exigirPermissao(
  recurso: Recurso,
  acao: Exclude<Nivel, "nenhum"> = "ler",
): Promise<SessionUser> {
  const sessao = await exigirSessao();

  if (!pode(sessao.role, recurso, acao)) {
    redirect(rotaInicial(sessao.role));
  }

  return sessao;
}

/** Exige que a sessão pertença a uma das áreas de navegação. */
export async function exigirArea(
  area: "gestao" | "consulta",
): Promise<SessionUser> {
  const sessao = await exigirSessao();
  const destino = rotaInicial(sessao.role);

  if (destino !== (area === "gestao" ? "/gestao" : "/portal")) {
    redirect(destino);
  }

  return sessao;
}
