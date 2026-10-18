import { NextResponse } from "next/server";

import { pode } from "@/core/auth/roles";
import { lerSessao } from "@/core/auth/session";
import {
  cabecalhosDaPlanilha,
  nomeDoArquivo,
} from "@/core/exportacao/planilha";
import { planilhaDeInadimplentes } from "@/features/exportacoes/services/financeiro.server";

/**
 * Inadimplentes em `.xlsx`, **uma linha por parcela**.
 *
 * O recorte por situação da tela não vem para cá: a planilha é sempre das
 * parcelas vencidas. Somar um filtro de "em aberto" devolveria o que ainda
 * não venceu numa lista chamada inadimplentes — para isso existe valores a
 * receber.
 */
export async function GET(requisicao: Request) {
  const sessao = await lerSessao();
  if (!sessao) return new NextResponse(null, { status: 401 });

  if (!pode(sessao.role, "financeiro", "ler")) {
    return new NextResponse(null, { status: 404 });
  }

  const filtros = new URL(requisicao.url).searchParams;

  const planilha = await planilhaDeInadimplentes(sessao, {
    turma: filtros.get("turma") ?? undefined,
  });

  return new NextResponse(new Uint8Array(planilha), {
    headers: cabecalhosDaPlanilha(nomeDoArquivo("inadimplencia")),
  });
}
