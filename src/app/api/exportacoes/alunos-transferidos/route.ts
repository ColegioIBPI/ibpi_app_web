import { NextResponse } from "next/server";

import { pode } from "@/core/auth/roles";
import { lerSessao } from "@/core/auth/session";
import { cabecalhosDaPlanilha, nomeDoArquivo } from "@/core/exportacao/planilha";
import { ataDeAlunosTransferidos } from "@/features/exportacoes/services/atas.server";

/** Ata de alunos transferidos, com a data de transferência. */
export async function GET(requisicao: Request) {
  const sessao = await lerSessao();
  if (!sessao) return new NextResponse(null, { status: 401 });

  if (!pode(sessao.role, "cadastros", "ler")) {
    return new NextResponse(null, { status: 404 });
  }

  const filtros = new URL(requisicao.url).searchParams;

  const planilha = await ataDeAlunosTransferidos(sessao, {
    turma: filtros.get("turma") ?? undefined,
  });

  return new NextResponse(new Uint8Array(planilha), {
    headers: cabecalhosDaPlanilha(nomeDoArquivo("ata-alunos-transferidos")),
  });
}
