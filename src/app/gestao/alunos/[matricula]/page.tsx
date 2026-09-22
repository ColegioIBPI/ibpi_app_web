import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { FichaDoAluno } from "@/features/alunos/components/ficha-do-aluno";
import { obterAlunoVisivel } from "@/features/alunos/services/alunos.server";

export async function generateMetadata({
  params,
}: PageProps<"/gestao/alunos/[matricula]">): Promise<Metadata> {
  const { matricula } = await params;
  return { title: `Aluno ${matricula}` };
}

export default async function AlunoPage({
  params,
}: PageProps<"/gestao/alunos/[matricula]">) {
  const sessao = await exigirPermissao("cadastros", "ler");
  const { matricula } = await params;

  const aluno = await obterAlunoVisivel(sessao, matricula);

  // `notFound` também para quem não tem escopo: dizer "existe, mas você não
  // pode ver" já confirma que o aluno estuda aqui.
  if (!aluno) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/gestao/alunos"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Alunos
        </Link>

        <h1 className="text-ink mt-2 text-xl font-semibold">{aluno.nome}</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Matrícula {aluno.matricula}
          {aluno.turmaCodigo ? ` · ${aluno.turmaCodigo}` : ""}
          {aluno.ativo ? "" : " · ex-aluno"}
        </p>
      </div>

      <FichaDoAluno aluno={aluno} />
    </div>
  );
}
