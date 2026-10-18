import { NextResponse } from "next/server";

import { pode } from "@/core/auth/roles";
import { lerSessao } from "@/core/auth/session";
import { anoLetivoAtual } from "@/core/lib/ano-letivo";
import {
  cabecalhosDaPlanilha,
  nomeDoArquivo,
} from "@/core/exportacao/planilha";
import { ataDeResultadoFinal } from "@/features/exportacoes/services/resultado-final.server";

/**
 * Ata de resultado final de **uma turma**.
 *
 * `turma` é o id da turma (`2026-EM1A`), e é obrigatório: as colunas são as
 * disciplinas daquela grade, e sem turma não há colunas.
 */
export async function GET(requisicao: Request) {
  const sessao = await lerSessao();
  if (!sessao) return new NextResponse(null, { status: 401 });

  if (!pode(sessao.role, "notas", "ler")) {
    return new NextResponse(null, { status: 404 });
  }

  const filtros = new URL(requisicao.url).searchParams;
  const turmaId = filtros.get("turma");

  if (!turmaId) {
    return new NextResponse("Informe a turma.", { status: 400 });
  }

  const ano = Number(filtros.get("ano")) || anoLetivoAtual();

  const planilha = await ataDeResultadoFinal(sessao, turmaId, ano);

  return new NextResponse(new Uint8Array(planilha), {
    headers: cabecalhosDaPlanilha(
      nomeDoArquivo(`ata-resultado-final-${turmaId}`),
    ),
  });
}
