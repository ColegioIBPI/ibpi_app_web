import { NextResponse } from "next/server";

import { pode } from "@/core/auth/roles";
import { lerSessao } from "@/core/auth/session";
import { trimestreDaQuery } from "@/core/lib/ano-letivo";
import { cabecalhosDaPlanilha, nomeDoArquivo } from "@/core/exportacao/planilha";
import { pautaDaDisciplina } from "@/features/exportacoes/services/pauta.server";

/**
 * Pauta de uma alocação (turma × disciplina) num trimestre.
 *
 * Responde 404 quando a alocação não é da pessoa — o mesmo que o diário
 * faz, e pelo mesmo motivo: dizer "existe, mas não é sua" já entrega que
 * aquela turma tem aquela disciplina.
 */
export async function GET(requisicao: Request) {
  const sessao = await lerSessao();
  if (!sessao) return new NextResponse(null, { status: 401 });

  if (!pode(sessao.role, "frequencia", "ler")) {
    return new NextResponse(null, { status: 404 });
  }

  const filtros = new URL(requisicao.url).searchParams;
  const alocacaoId = filtros.get("alocacao");

  if (!alocacaoId) {
    return new NextResponse("Informe a alocação.", { status: 400 });
  }

  const pauta = await pautaDaDisciplina(
    sessao,
    alocacaoId,
    trimestreDaQuery(filtros.get("trimestre") ?? undefined),
  );

  if (!pauta) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(pauta.arquivo), {
    headers: cabecalhosDaPlanilha(nomeDoArquivo(pauta.nome)),
  });
}
