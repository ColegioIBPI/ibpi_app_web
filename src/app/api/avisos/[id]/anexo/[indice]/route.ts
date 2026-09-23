import { NextResponse } from "next/server";

import { lerSessao } from "@/core/auth/session";
import {
  lerAnexo,
  obterAvisoVisivel,
} from "@/features/avisos/services/avisos.server";

/**
 * Serve o anexo de um aviso.
 *
 * Mesmo princípio da foto do aluno: o arquivo não tem endereço público, e
 * quem pede passa pela mesma verificação de alcance do aviso. Um anexo pode
 * ser uma circular endereçada a uma única família.
 */
export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ id: string; indice: string }> },
) {
  const sessao = await lerSessao();
  if (!sessao) return new NextResponse(null, { status: 401 });

  const { id, indice } = await params;
  const aviso = await obterAvisoVisivel(sessao, id);
  if (!aviso) return new NextResponse(null, { status: 404 });

  const anexo = aviso.anexos[Number(indice)];
  if (!anexo) return new NextResponse(null, { status: 404 });

  const conteudo = await lerAnexo(anexo.path);
  if (!conteudo) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(conteudo), {
    headers: {
      "Content-Type": anexo.tipo,
      // `inline` para o PDF e a imagem abrirem no navegador; o nome original
      // vai junto para o download sair com um nome reconhecível.
      "Content-Disposition": `inline; filename="${encodeURIComponent(anexo.nome)}"`,
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(conteudo.length),
    },
  });
}
