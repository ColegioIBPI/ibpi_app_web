import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/core/auth/cookie";

/**
 * Primeira barreira de acesso.
 *
 * O proxy roda antes da renderização, fora do runtime Node, e por isso
 * **não consegue verificar a assinatura do cookie** — ele só checa se existe.
 * Serve para evitar carregar uma página inteira para quem nem sessão tem, e
 * para tirar quem já entrou da tela de login.
 *
 * A autorização de verdade (assinatura, revogação, perfil) acontece nos
 * layouts, via `exigirSessao` / `exigirPermissao`. Nenhuma decisão de
 * segurança depende deste arquivo.
 */

const ROTAS_PUBLICAS = ["/login", "/recuperar-senha", "/definir-senha"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const temCookie = request.cookies.has(SESSION_COOKIE);
  const ehPublica = ROTAS_PUBLICAS.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );

  if (!temCookie && !ehPublica) {
    const url = new URL("/login", request.url);
    // Guarda o destino para devolver a pessoa ao lugar certo depois do login.
    if (pathname !== "/") url.searchParams.set("continuar", pathname);
    return NextResponse.redirect(url);
  }

  if (temCookie && pathname === "/login") {
    // Para onde exatamente, quem decide é a página inicial, que conhece o
    // perfil. Aqui não dá para saber.
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Sem matcher, o proxy rodaria também em CSS, imagem e arquivo estático —
  // e o redirecionamento de login bloquearia o carregamento da própria tela
  // de login.
  //
  // `api` fica de fora por um motivo diferente e importante: redirecionar
  // uma chamada de API devolve o HTML da tela de login com status 200, e o
  // `fetch` do cliente quebra ao tentar lê-lo como JSON — com uma mensagem
  // que não tem nada a ver com o problema real. Rota de API responde em
  // JSON, inclusive quando nega; cada handler verifica a sessão por conta
  // própria, que é onde a verificação vale de verdade.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|brand/|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
