import { NextResponse } from "next/server";

import { sessaoDaRequisicao } from "@/core/auth/requisicao";
import {
  lerArquivoDoBoleto,
  obterBoleto,
} from "@/features/financeiro/services/boleto.server";

/**
 * Serve o boleto do aluno.
 *
 * Como a foto e o comprovante: o arquivo não tem endereço público, e quem
 * pede passa pelo escopo do financeiro — a família vê o dos filhos, a
 * equipe vê o de todos, o aluno não vê.
 *
 * Um boleto traz nome, valor e linha digitável. Endereço adivinhável no
 * bucket tornaria isso acessível a quem souber montar a URL.
 *
 * `Content-Disposition: attachment` de propósito: boleto é para baixar e
 * levar ao banco, e no celular o `inline` abre num visualizador de onde
 * nem sempre dá para salvar.
 */
export async function GET(
  requisicao: Request,
  { params }: RouteContext<"/api/alunos/[matricula]/boleto">,
) {
  const sessao = await sessaoDaRequisicao(requisicao);
  if (!sessao) return new NextResponse(null, { status: 401 });

  const { matricula } = await params;
  const boleto = await obterBoleto(sessao, matricula);

  // 404 também para quem não tem direito: "existe, mas você não pode ver"
  // já confirma que a pessoa estuda aqui.
  if (!boleto?.arquivo?.path) return new NextResponse(null, { status: 404 });

  const conteudo = await lerArquivoDoBoleto(boleto.arquivo.path);
  if (!conteudo) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(conteudo), {
    headers: {
      "Content-Type": boleto.arquivo.tipo,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(
        boleto.arquivo.nome,
      )}"`,
      // Boleto muda; cache longo entregaria o do mês passado.
      "Cache-Control": "private, no-store",
      "Content-Length": String(conteudo.length),
    },
  });
}
