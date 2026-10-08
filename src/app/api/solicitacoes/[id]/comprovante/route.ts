import { NextResponse } from "next/server";

import { sessaoDaRequisicao } from "@/core/auth/requisicao";
import { lerComprovante } from "@/features/solicitacoes/services/registro.server";
import { obterSolicitacaoVisivel } from "@/features/solicitacoes/services/solicitacoes.server";

/**
 * Serve o comprovante de pagamento de uma 2ª chamada.
 *
 * Mesmo princípio da foto do aluno e do anexo de aviso: o arquivo não tem
 * endereço público, e quem pede passa pela mesma verificação de escopo do
 * pedido — a família vê o do próprio filho, a escola vê o que atende.
 *
 * Um comprovante traz nome, valor e muitas vezes a conta de quem pagou.
 * Endereço adivinhável no bucket tornaria isso acessível a quem souber
 * montar a URL.
 */
export async function GET(
  requisicao: Request,
  { params }: RouteContext<"/api/solicitacoes/[id]/comprovante">,
) {
  const sessao = await sessaoDaRequisicao(requisicao);
  if (!sessao) return new NextResponse(null, { status: 401 });

  const { id } = await params;
  const solicitacao = await obterSolicitacaoVisivel(sessao, id);

  // 404 também para quem não tem direito: "existe, mas você não pode ver"
  // já conta que o pedido existe.
  if (!solicitacao || solicitacao.tipo !== "segunda-chamada") {
    return new NextResponse(null, { status: 404 });
  }

  const conteudo = await lerComprovante(solicitacao.comprovante.path);
  if (!conteudo) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(conteudo), {
    headers: {
      "Content-Type": solicitacao.comprovante.tipo,
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        solicitacao.comprovante.nome,
      )}"`,
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(conteudo.length),
    },
  });
}
