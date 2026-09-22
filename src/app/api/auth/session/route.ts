import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminAuth } from "@/core/firebase/admin";
import { criarSessao, encerrarSessao, lerPerfil } from "@/core/auth/session";
import { rotaInicial } from "@/core/auth/roles";

/**
 * Troca o token de login por um cookie de sessão, e o encerra no logout.
 *
 * O cliente autentica no Firebase, recebe um token de ID e o envia aqui uma
 * única vez. A partir daí o navegador só carrega um cookie HttpOnly, que o
 * JavaScript da página não consegue ler.
 */

const bodySchema = z.object({
  idToken: z.string().min(1),
});

export async function POST(request: Request) {
  const corpo = bodySchema.safeParse(await request.json().catch(() => null));

  if (!corpo.success) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  try {
    // `true` recusa token de conta revogada ou desativada.
    const claims = await getAdminAuth().verifyIdToken(corpo.data.idToken, true);
    const perfil = await lerPerfil(claims.uid, claims.role);

    if (!perfil) {
      // Autenticou no Firebase mas não tem cadastro no sistema. Acontece com
      // conta criada direto no console, sem passar pela secretaria.
      return NextResponse.json(
        {
          erro: "Sua conta ainda não está liberada no sistema. Fale com a secretaria.",
        },
        { status: 403 },
      );
    }

    await criarSessao(corpo.data.idToken);

    return NextResponse.json({ rota: rotaInicial(perfil.role) });
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível iniciar a sessão. Tente entrar novamente." },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  await encerrarSessao();
  return NextResponse.json({ ok: true });
}
