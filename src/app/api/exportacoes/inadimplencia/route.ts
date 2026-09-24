import { NextResponse } from "next/server";

import { pode } from "@/core/auth/roles";
import { lerSessao } from "@/core/auth/session";
import {
  cabecalhosDaPlanilha,
  nomeDoArquivo,
} from "@/core/exportacao/planilha";
import { recorteDaQuery } from "@/features/financeiro/domain/lista";
import { planilhaDeInadimplencia } from "@/features/exportacoes/services/exportacoes.server";

/** Relatório de inadimplência em `.xlsx`, com os mesmos filtros da tela. */
export async function GET(requisicao: Request) {
  const sessao = await lerSessao();
  if (!sessao) return new NextResponse(null, { status: 401 });

  if (!pode(sessao.role, "financeiro", "ler")) {
    return new NextResponse(null, { status: 404 });
  }

  const filtros = new URL(requisicao.url).searchParams;

  const planilha = await planilhaDeInadimplencia(sessao, {
    turma: filtros.get("turma") ?? undefined,
    recorte: recorteDaQuery(filtros.get("situacao")),
  });

  return new NextResponse(new Uint8Array(planilha), {
    headers: cabecalhosDaPlanilha(nomeDoArquivo("inadimplencia")),
  });
}
