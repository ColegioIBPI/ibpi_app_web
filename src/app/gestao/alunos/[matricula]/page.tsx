import { ArrowLeft, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { pode } from "@/core/auth/roles";
import { formatarTelefone } from "@/core/lib/format";
import { ROTULOS_DE_TIPO_DE_RESPONSAVEL } from "@/core/modelo";
import { Card } from "@/core/ui/card";
import { FichaDoAluno } from "@/features/alunos/components/ficha-do-aluno";
import { FotoDoAluno } from "@/features/alunos/components/foto-do-aluno";
import { obterAlunoVisivel } from "@/features/alunos/services/alunos.server";
import { listarResponsaveisDoAluno } from "@/features/responsaveis/services/responsaveis.server";

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/gestao/alunos"
            className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Alunos
          </Link>

          <div className="mt-2 flex items-center gap-4">
            <FotoDoAluno
              matricula={aluno.matricula}
              nome={aluno.nome}
              fotoPath={aluno.fotoPath}
              fotoAtualizadaEm={aluno.fotoAtualizadaEm}
              tamanho={72}
            />
            <div>
              <h1 className="text-ink text-xl font-semibold">{aluno.nome}</h1>
              <p className="text-ink-muted mt-1 text-sm">
                Matrícula {aluno.matricula}
                {aluno.turmaCodigo ? ` · ${aluno.turmaCodigo}` : ""}
                {aluno.ativo ? "" : " · ex-aluno"}
              </p>
            </div>
          </div>
        </div>

        {/* Professor e financeiro leem o cadastro, mas não editam. */}
        {pode(sessao.role, "cadastros", "gerenciar") && (
          <Link
            href={`/gestao/alunos/${aluno.matricula}/editar`}
            className="border-line text-ink hover:bg-surface-subtle inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium"
          >
            <Pencil className="size-4" aria-hidden />
            Editar
          </Link>
        )}
      </div>

      {/*
        Os responsáveis vêm **antes** da ficha, e não no fim: quem abre o
        cadastro de um aluno costuma estar prestes a falar com a família, e
        rolar a página inteira para achar um telefone é o atrito que faz a
        pessoa voltar a procurar no caderno.

        Secretaria e coordenação gerenciam a família; professor e financeiro
        não têm por que ver o cadastro dos responsáveis a partir daqui.
      */}
      {pode(sessao.role, "cadastros", "gerenciar") && (
        <ResponsaveisDoAluno matricula={aluno.matricula} />
      )}

      <FichaDoAluno aluno={aluno} />
    </div>
  );
}

async function ResponsaveisDoAluno({ matricula }: { matricula: string }) {
  const responsaveis = await listarResponsaveisDoAluno(matricula);

  return (
    <Card
      title="Responsáveis"
      description="Quem acompanha este aluno pelo Portal."
    >
      {responsaveis.length === 0 ? (
        <p className="text-ink-muted text-sm">
          Nenhum responsável vinculado. O vínculo é feito na ficha do
          responsável.
        </p>
      ) : (
        <ul className="divide-line divide-y text-sm">
          {responsaveis.map((responsavel) => (
            <li
              key={responsavel.id}
              className="flex items-center justify-between gap-4 py-2.5"
            >
              <div>
                <Link
                  href={`/gestao/responsaveis/${responsavel.id}`}
                  className="text-brand-600 font-medium hover:underline"
                >
                  {responsavel.nome}
                </Link>
                <span className="text-ink-muted ml-2 text-xs">
                  {responsavel.parentesco ?? "Responsável"}
                  {responsavel.tipo
                    ? ` · ${ROTULOS_DE_TIPO_DE_RESPONSAVEL[responsavel.tipo]}`
                    : ""}
                </span>

                {/* O telefone fica na linha do nome, e não escondido na
                    ficha do responsável: é o motivo mais comum de alguém
                    abrir esta tela. */}
                <p className="text-ink mt-0.5 text-sm">
                  {responsavel.telefone ? (
                    <a
                      href={`tel:${responsavel.telefone}`}
                      className="hover:underline"
                    >
                      {formatarTelefone(responsavel.telefone)}
                    </a>
                  ) : (
                    <span className="text-ink-muted">sem telefone</span>
                  )}
                  {responsavel.email && (
                    <span className="text-ink-muted">
                      {" · "}
                      {responsavel.email}
                    </span>
                  )}
                </p>
              </div>
              <span className="text-ink-muted text-xs whitespace-nowrap">
                {responsavel.uid ? "com acesso" : "sem acesso"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
