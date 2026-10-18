import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type Responsavel } from "@/core/modelo";
import { BotaoDeImpressao } from "@/core/ui/botao-de-impressao";
import { Card } from "@/core/ui/card";
import { FichaFinanceira } from "@/features/financeiro/components/ficha-financeira";
import { ordenarPorVencimento } from "@/features/financeiro/domain/cobranca";
import { extratoDoAluno } from "@/features/financeiro/services/financeiro.server";

export const metadata: Metadata = { title: "Ficha financeira" };

/**
 * Ficha financeira para imprimir: **todas** as parcelas, pagas e não pagas.
 *
 * Usa o mesmo `extratoDoAluno` da tela, e não uma consulta própria: dois
 * caminhos para o mesmo dado é como a ficha entregue à família passa a
 * discordar do extrato que a secretaria olha.
 */
export default async function FichaFinanceiraPage({
  params,
}: PageProps<"/gestao/financeiro/[matricula]/ficha">) {
  const sessao = await exigirPermissao("financeiro", "ler");
  const { matricula } = await params;

  const extrato = await extratoDoAluno(sessao, matricula);
  if (!extrato) notFound();

  const responsaveisDocs = await getAdminDb()
    .collection(COLECOES.responsaveis)
    .where("alunosVinculados", "array-contains", matricula)
    .get();

  return (
    <div className="flex flex-col gap-6">
      <div
        data-impressao="ocultar"
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <Link
          href={`/gestao/financeiro/${matricula}`}
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {extrato.nome}
        </Link>

        <BotaoDeImpressao />
      </div>

      <Card>
        <FichaFinanceira
          nome={extrato.nome}
          matricula={extrato.matricula}
          turmaCodigo={extrato.turmaCodigo ?? null}
          parcelas={ordenarPorVencimento(extrato.cobrancas)}
          responsaveis={responsaveisDocs.docs.map(
            (doc) => doc.data() as Responsavel,
          )}
          planoAcordado={extrato.planoAcordado?.texto ?? null}
        />
      </Card>
    </div>
  );
}
