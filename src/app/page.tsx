import { redirect } from "next/navigation";

import { rotaInicial } from "@/core/auth/roles";
import { lerSessao } from "@/core/auth/session";

/**
 * Porta de entrada: manda cada um para a sua área.
 *
 * É aqui que o perfil é consultado — o `proxy.ts` sabe que existe cookie,
 * mas não consegue ler quem é.
 */
export default async function HomePage() {
  const sessao = await lerSessao();

  redirect(sessao ? rotaInicial(sessao.role) : "/login");
}
