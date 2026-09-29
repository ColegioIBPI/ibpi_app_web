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

/**
 * Deploy de _preview_ não atende.
 *
 * A Vercel publica **toda** branch e todo pull request numa URL pública, e
 * hoje existe um projeto Firebase só: uma preview serviria o cadastro real
 * de 73 alunos menores de idade numa URL que ninguém controla e que sai em
 * comentário de PR, log de build e histórico de navegador.
 *
 * Por isso a porta nasce fechada. Para abrir uma preview de propósito,
 * defina `PERMITIR_PREVIEW=1` **naquele deploy** — é uma decisão consciente,
 * tomada por deploy, em vez do padrão silencioso.
 *
 * Isto **não substitui** o Deployment Protection da Vercel (ver
 * `docs/deploy.md`): aquilo barra antes de chegar aqui, e vale também para
 * os arquivos estáticos que este proxy nem enxerga. São duas barreiras para
 * o mesmo vazamento, porque uma configuração de painel é fácil de perder num
 * reimport do projeto.
 */
function previewBloqueada(): boolean {
  return (
    process.env.VERCEL_ENV === "preview" && process.env.PERMITIR_PREVIEW !== "1"
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ehApi = pathname.startsWith("/api");

  // 404, e não 403: um "proibido" confirma que existe um Portal ali.
  if (previewBloqueada()) {
    return ehApi
      ? NextResponse.json({ erro: "Não encontrado" }, { status: 404 })
      : new NextResponse("Não encontrado", {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
  }

  // Fora isso, o proxy não mexe em rota de API: redirecionar uma chamada de
  // API devolveria o HTML da tela de login com status 200, e o `fetch` do
  // cliente quebraria ao tentar lê-lo como JSON — com uma mensagem que não
  // tem nada a ver com o problema real. Cada handler verifica a sessão por
  // conta própria, que é onde a verificação vale de verdade.
  if (ehApi) return NextResponse.next();

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
  // `api` **entra** no matcher, ao contrário do que seria natural, por causa
  // do bloqueio de preview: sem isso, uma preview publicada continuaria
  // servindo `/api/exportacoes/...` para quem tivesse cookie válido — e a
  // planilha de alunos é exatamente o que não pode sair por uma URL pública.
  // Para tudo o que não é o bloqueio, a função devolve `next()` logo no
  // começo e a rota de API segue como antes.
  // `robots.txt` precisa ficar de fora: ele existe justamente para ser lido
  // sem sessão, e dentro do matcher o buscador receberia o HTML da tela de
  // login no lugar das regras — ou seja, nenhuma regra.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|brand/|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
