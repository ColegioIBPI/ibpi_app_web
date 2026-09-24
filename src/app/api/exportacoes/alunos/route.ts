import { NextResponse } from "next/server";

import { pode } from "@/core/auth/roles";
import { lerSessao } from "@/core/auth/session";
import {
  cabecalhosDaPlanilha,
  nomeDoArquivo,
} from "@/core/exportacao/planilha";
import { planilhaDeAlunos } from "@/features/exportacoes/services/exportacoes.server";

/**
 * Lista de alunos em `.xlsx`.
 *
 * A planilha é uma **cópia de dado pessoal de menor saindo do sistema**, com
 * telefone, e-mail e filiação. Por isso: exige sessão, exige permissão de
 * cadastro, respeita o escopo da pessoa (o professor leva só as turmas que
 * leciona) e sai com `no-store`.
 */
export async function GET(requisicao: Request) {
  const sessao = await lerSessao();
  if (!sessao) return new NextResponse(null, { status: 401 });

  if (!pode(sessao.role, "cadastros", "ler")) {
    return new NextResponse(null, { status: 404 });
  }

  const filtros = new URL(requisicao.url).searchParams;

  const planilha = await planilhaDeAlunos(sessao, {
    turma: filtros.get("turma") ?? undefined,
    incluirInativos: filtros.get("situacao") === "todos",
  });

  return new NextResponse(new Uint8Array(planilha), {
    headers: cabecalhosDaPlanilha(nomeDoArquivo("alunos")),
  });
}
