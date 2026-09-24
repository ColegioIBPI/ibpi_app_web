import { NextResponse } from "next/server";

import { pode } from "@/core/auth/roles";
import { lerSessao } from "@/core/auth/session";
import {
  cabecalhosDaPlanilha,
  nomeDoArquivo,
} from "@/core/exportacao/planilha";
import { planilhaDeFrequencia } from "@/features/exportacoes/services/exportacoes.server";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Frequência de uma turma num período, em `.xlsx`.
 *
 * Turma e período são obrigatórios: sem eles a consulta traria o ano letivo
 * inteiro de todo mundo, e a planilha deixaria de responder a pergunta que
 * motivou o pedido.
 */
export async function GET(requisicao: Request) {
  const sessao = await lerSessao();
  if (!sessao) return new NextResponse(null, { status: 401 });

  if (!pode(sessao.role, "frequencia", "lancar")) {
    return new NextResponse(null, { status: 404 });
  }

  const filtros = new URL(requisicao.url).searchParams;
  const turmaId = filtros.get("turma");
  const de = filtros.get("de");
  const ate = filtros.get("ate");

  if (!turmaId || !de || !ate || !DATA.test(de) || !DATA.test(ate)) {
    return NextResponse.json(
      { erro: "Informe a turma e o período (de e ate, em AAAA-MM-DD)." },
      { status: 400 },
    );
  }

  if (de > ate) {
    return NextResponse.json(
      { erro: "O início do período vem depois do fim." },
      { status: 400 },
    );
  }

  const planilha = await planilhaDeFrequencia(sessao, { turmaId, de, ate });

  return new NextResponse(new Uint8Array(planilha), {
    headers: cabecalhosDaPlanilha(nomeDoArquivo(`frequencia-${turmaId}`)),
  });
}
