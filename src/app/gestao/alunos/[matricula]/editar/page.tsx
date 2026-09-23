import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { Card } from "@/core/ui/card";
import { FormularioDoAluno } from "@/features/alunos/components/formulario-do-aluno";
import { UploadDaFoto } from "@/features/alunos/components/upload-da-foto";
import { obterAlunoVisivel } from "@/features/alunos/services/alunos.server";

export const metadata: Metadata = { title: "Editar aluno" };

export default async function EditarAlunoPage({
  params,
}: PageProps<"/gestao/alunos/[matricula]/editar">) {
  // Editar é privilégio de secretaria e coordenação; professor só lê.
  const sessao = await exigirPermissao("cadastros", "gerenciar");
  const { matricula } = await params;

  const aluno = await obterAlunoVisivel(sessao, matricula);
  if (!aluno) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/gestao/alunos/${matricula}`}
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {aluno.nome}
        </Link>

        <h1 className="text-ink mt-2 text-xl font-semibold">Editar cadastro</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Matrícula {aluno.matricula} — não pode ser alterada, é a chave do
          histórico escolar.
        </p>
      </div>

      <Card title="Foto">
        <UploadDaFoto
          matricula={aluno.matricula}
          nome={aluno.nome}
          fotoPath={aluno.fotoPath}
          fotoAtualizadaEm={aluno.fotoAtualizadaEm}
        />
      </Card>

      <FormularioDoAluno aluno={aluno} />
    </div>
  );
}
