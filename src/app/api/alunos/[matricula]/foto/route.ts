import { NextResponse } from "next/server";

import { lerSessao } from "@/core/auth/session";
import { obterAlunoVisivel } from "@/features/alunos/services/alunos.server";
import { lerFoto } from "@/features/alunos/services/foto.server";

/**
 * Serve a foto do aluno.
 *
 * Esta rota existe no lugar de uma URL pública do bucket. Foto de menor de
 * idade não pode ter endereço adivinhável nem compartilhável: quem pede
 * passa pelo **mesmo escopo do cadastro** — secretaria e coordenação veem
 * todas, o professor só as das turmas que leciona, o responsável só as dos
 * filhos, o aluno só a dele.
 *
 * Quem não tem direito recebe 404, não 403: "existe, mas você não pode ver"
 * já confirma que a pessoa estuda aqui.
 */
export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ matricula: string }> },
) {
  const sessao = await lerSessao();
  if (!sessao) return new NextResponse(null, { status: 401 });

  const { matricula } = await params;
  const aluno = await obterAlunoVisivel(sessao, matricula);

  if (!aluno?.fotoPath) return new NextResponse(null, { status: 404 });

  const imagem = await lerFoto(aluno.fotoPath);
  if (!imagem) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(imagem), {
    headers: {
      "Content-Type": "image/webp",
      // `private` mantém a imagem fora de cache compartilhado; o endereço
      // muda quando a foto troca, então o cache do navegador é seguro.
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(imagem.length),
    },
  });
}
