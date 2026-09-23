import { ArrowLeft, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { Card } from "@/core/ui/card";
import { Vinculos } from "@/features/responsaveis/components/vinculos";
import {
  listarAlunosParaVincular,
  listarFilhos,
  obterResponsavel,
} from "@/features/responsaveis/services/responsaveis.server";

export async function generateMetadata({
  params,
}: PageProps<"/gestao/responsaveis/[id]">): Promise<Metadata> {
  const { id } = await params;
  const responsavel = await obterResponsavel(id);
  return { title: responsavel?.nome ?? "Responsável" };
}

export default async function ResponsavelPage({
  params,
}: PageProps<"/gestao/responsaveis/[id]">) {
  await exigirPermissao("cadastros", "gerenciar");
  const { id } = await params;

  const responsavel = await obterResponsavel(id);
  if (!responsavel) notFound();

  const vinculados = responsavel.alunosVinculados ?? [];
  const [filhos, disponiveis] = await Promise.all([
    listarFilhos(vinculados),
    listarAlunosParaVincular(vinculados),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/gestao/responsaveis"
            className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Responsáveis
          </Link>

          <h1 className="text-ink mt-2 text-xl font-semibold">
            {responsavel.nome}
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            {responsavel.parentesco ?? "Responsável"}
            {responsavel.email ? ` · ${responsavel.email}` : ""}
            {responsavel.ativo ? "" : " · inativo"}
          </p>
        </div>

        <Link
          href={`/gestao/responsaveis/${responsavel.id}/editar`}
          className="border-line text-ink hover:bg-surface-subtle inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium"
        >
          <Pencil className="size-4" aria-hidden />
          Editar
        </Link>
      </div>

      <Card title="Contato">
        <dl className="divide-line divide-y text-sm">
          <div className="grid grid-cols-[10rem_1fr] gap-3 py-2">
            <dt className="text-ink-muted">E-mail</dt>
            <dd className="text-ink break-all">{responsavel.email ?? "—"}</dd>
          </div>
          <div className="grid grid-cols-[10rem_1fr] gap-3 py-2">
            <dt className="text-ink-muted">Telefone</dt>
            <dd className="text-ink">
              {formatarTelefone(responsavel.telefone)}
            </dd>
          </div>
          <div className="grid grid-cols-[10rem_1fr] gap-3 py-2">
            <dt className="text-ink-muted">CPF</dt>
            <dd className="text-ink">{formatarCpf(responsavel.cpf)}</dd>
          </div>
        </dl>
      </Card>

      <Card
        title="Alunos e acesso"
        description="O vínculo define o que o responsável enxerga no Portal."
      >
        <Vinculos
          responsavel={responsavel}
          filhos={filhos}
          disponiveis={disponiveis}
        />
      </Card>
    </div>
  );
}

function formatarCpf(valor: string | null | undefined): string {
  if (!valor || valor.length !== 11) return valor ?? "—";
  return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6, 9)}-${valor.slice(9)}`;
}

function formatarTelefone(valor: string | null | undefined): string {
  if (!valor) return "—";

  const digitos = valor.replace(/\D/g, "").replace(/^55/, "");
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return valor;
}
