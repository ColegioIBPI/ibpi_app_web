"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { exigirSessao } from "@/core/auth/guards";
import { anoLetivoAtual } from "@/core/lib/ano-letivo";
import { COOKIE_DO_ANO } from "@/core/escola/ano-letivo.server";

/**
 * Troca o ano letivo em que a pessoa está trabalhando.
 *
 * **Não é permissão, é contexto.** Quem pode ver 2026 pode ver 2027 — o
 * que cada perfil alcança continua sendo a matriz de acesso, e trocar o
 * ano não abre porta nenhuma. Por isso basta sessão.
 *
 * O cookie não é `HttpOnly`: ele não guarda segredo, e um valor
 * adulterado só faz a pessoa ver um ano vazio. O da sessão, esse sim, é
 * `HttpOnly` — ver `core/auth/cookie`.
 */

const entrada = z.object({ ano: z.coerce.number().int() });

export async function escolherAnoLetivo(ano: number): Promise<void> {
  await exigirSessao();

  const dados = entrada.safeParse({ ano });
  if (!dados.success) return;

  const atual = anoLetivoAtual();
  if (dados.data.ano < atual - 10 || dados.data.ano > atual + 2) return;

  (await cookies()).set(COOKIE_DO_ANO, String(dados.data.ano), {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // Um ano: a escolha atravessa o recesso, que é quando ela mais
    // importa — a secretaria monta 2027 em dezembro de 2026.
    maxAge: 60 * 60 * 24 * 365,
  });

  // Todas as telas de gestão leem o ano; nenhuma pode ficar para trás.
  revalidatePath("/", "layout");
}
