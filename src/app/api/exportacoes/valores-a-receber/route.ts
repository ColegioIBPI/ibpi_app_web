import { NextResponse } from "next/server";

import { pode } from "@/core/auth/roles";
import { lerSessao } from "@/core/auth/session";
import {
  cabecalhosDaPlanilha,
  nomeDoArquivo,
} from "@/core/exportacao/planilha";
import { planilhaDeValoresAReceber } from "@/features/exportacoes/services/financeiro.server";

/** `AAAA-MM-DD`, como o resto do sistema. */
const DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valores a receber até uma data, uma linha por parcela.
 *
 * Sem `ate` a rota recusa, em vez de assumir hoje ou o fim do ano: o
 * relatório é "de acordo com data especificada", e uma data chutada sai
 * numa planilha que ninguém confere antes de levar para a reunião.
 */
export async function GET(requisicao: Request) {
  const sessao = await lerSessao();
  if (!sessao) return new NextResponse(null, { status: 401 });

  if (!pode(sessao.role, "financeiro", "ler")) {
    return new NextResponse(null, { status: 404 });
  }

  const filtros = new URL(requisicao.url).searchParams;
  const ate = filtros.get("ate") ?? "";

  if (!DATA.test(ate)) {
    return new NextResponse("Informe a data limite (AAAA-MM-DD).", {
      status: 400,
    });
  }

  const planilha = await planilhaDeValoresAReceber(sessao, ate, {
    turma: filtros.get("turma") ?? undefined,
  });

  return new NextResponse(new Uint8Array(planilha), {
    headers: cabecalhosDaPlanilha(nomeDoArquivo(`valores-a-receber-ate-${ate}`)),
  });
}
