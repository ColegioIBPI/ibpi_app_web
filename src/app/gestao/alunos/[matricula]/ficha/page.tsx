import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { BotaoDeImpressao } from "@/core/ui/botao-de-impressao";
import { Card } from "@/core/ui/card";
import { FichaCadastral } from "@/features/alunos/components/ficha-cadastral";
import { obterAlunoVisivel } from "@/features/alunos/services/alunos.server";
import { listarCursos } from "@/features/cursos/services/cursos.server";
import { listarResponsaveisDoAluno } from "@/features/responsaveis/services/responsaveis.server";

export const metadata: Metadata = { title: "Ficha cadastral" };

/**
 * Ficha cadastral para imprimir.
 *
 * Exige `gerenciar`: a ficha reúne filiação, documentos e endereço num
 * documento só, e isso é mais do que o professor precisa para dar aula.
 */
export default async function FichaCadastralPage({
  params,
}: PageProps<"/gestao/alunos/[matricula]/ficha">) {
  const sessao = await exigirPermissao("cadastros", "gerenciar");
  const { matricula } = await params;

  const aluno = await obterAlunoVisivel(sessao, matricula);
  if (!aluno) notFound();

  const [responsaveis, cursos] = await Promise.all([
    listarResponsaveisDoAluno(matricula),
    listarCursos(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div
        data-impressao="ocultar"
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <Link
          href={`/gestao/alunos/${matricula}`}
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {aluno.nome}
        </Link>

        <BotaoDeImpressao />
      </div>

      <Card>
        <FichaCadastral
          aluno={aluno}
          responsaveis={responsaveis}
          cursos={cursos}
        />
      </Card>
    </div>
  );
}
