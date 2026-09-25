import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { opcoesDeDestino } from "@/core/escola/destinos.server";
import { ROTULOS_DE_INFORMACAO } from "@/core/modelo";
import { BotaoDePublicacao } from "@/core/ui/botao-de-publicacao";
import { alterarPublicacao } from "@/features/informacoes/actions/informacoes";
import { FormularioDeInformacao } from "@/features/informacoes/components/formulario";
import { obterInformacao } from "@/features/informacoes/services/informacoes.server";

export async function generateMetadata({
  params,
}: PageProps<"/gestao/informacoes/[id]">): Promise<Metadata> {
  const { id } = await params;
  const informacao = await obterInformacao(id);

  return { title: informacao?.titulo ?? "Informação" };
}

export default async function InformacaoPage({
  params,
}: PageProps<"/gestao/informacoes/[id]">) {
  await exigirPermissao("avisos", "gerenciar");
  const { id } = await params;

  const informacao = await obterInformacao(id);
  if (!informacao) notFound();

  const { turmas, alunos, responsaveis } = await opcoesDeDestino();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/gestao/informacoes"
            className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Informações úteis
          </Link>

          <h1 className="text-ink mt-2 text-xl font-semibold">
            {informacao.titulo}
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            {ROTULOS_DE_INFORMACAO[informacao.tipo]}
            {informacao.ativo ? "" : " · fora do ar"}
          </p>
        </div>

        <BotaoDePublicacao
          id={informacao.id}
          ativo={informacao.ativo}
          acao={alterarPublicacao}
        />
      </div>

      <FormularioDeInformacao
        informacao={informacao}
        turmas={turmas}
        alunos={alunos}
        responsaveis={responsaveis}
      />
    </div>
  );
}
