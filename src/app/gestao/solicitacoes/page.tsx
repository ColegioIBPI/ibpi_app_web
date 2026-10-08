import type { Metadata } from "next";

import { exigirPermissao } from "@/core/auth/guards";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/states";
import { FilaDeSolicitacoes } from "@/features/solicitacoes/components/fila";
import { estaEncerrada } from "@/features/solicitacoes/domain/fila";
import { listarFila } from "@/features/solicitacoes/services/solicitacoes.server";

export const metadata: Metadata = { title: "Solicitações" };

export default async function SolicitacoesPage() {
  const sessao = await exigirPermissao("solicitacoes", "gerenciar");
  const solicitacoes = await listarFila(sessao);

  const pendentes = solicitacoes.filter(
    (solicitacao) => !estaEncerrada(solicitacao.situacao),
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Solicitações</h1>
        <p className="text-ink-muted mt-1 text-sm">
          {pendentes === 0
            ? "Nada pendente."
            : `${pendentes} ${pendentes === 1 ? "pedido aguardando" : "pedidos aguardando"}`}
          {solicitacoes.length > 0 && ` · ${solicitacoes.length} no total`}
        </p>
      </div>

      {solicitacoes.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum pedido recebido"
            description="Os pedidos que as famílias fizerem pelo Portal aparecem aqui, do mais antigo para o mais recente."
          />
        </Card>
      ) : (
        <FilaDeSolicitacoes solicitacoes={solicitacoes} />
      )}
    </div>
  );
}
