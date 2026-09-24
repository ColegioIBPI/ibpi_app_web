import type { Metadata } from "next";

import { exigirArea } from "@/core/auth/guards";
import { formatCurrency } from "@/core/lib/format";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/states";
import { Extrato } from "@/features/financeiro/components/extrato";
import { extratoDoAluno } from "@/features/financeiro/services/financeiro.server";

export const metadata: Metadata = { title: "Financeiro" };

/**
 * Financeiro da família — somente leitura.
 *
 * O perfil aluno não chega aqui: mensalidade é assunto de quem paga, e a
 * matriz de permissões já fecha a porta (README, seção 3.1). O guarda de
 * rota confere de novo, porque esconder o link é conveniência, não
 * segurança.
 */
export default async function FinanceiroDoPortalPage() {
  const sessao = await exigirArea("consulta");

  if (sessao.role !== "responsavel" || sessao.alunosVinculados.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Financeiro indisponível"
          description="O acompanhamento de mensalidade é do responsável financeiro. Fale com a secretaria."
        />
      </Card>
    );
  }

  const extratos = (
    await Promise.all(
      sessao.alunosVinculados.map((matricula) =>
        extratoDoAluno(sessao, matricula),
      ),
    )
  ).filter((extrato) => extrato !== null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Financeiro</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Situação das parcelas. Pagamentos são feitos fora do sistema, no
          banco ou na secretaria.
        </p>
      </div>

      {extratos.length === 0 ? (
        <Card>
          <EmptyState
            title="Nada registrado"
            description="Nenhuma parcela foi lançada para os seus filhos."
          />
        </Card>
      ) : (
        extratos.map((extrato) => (
          <Card
            key={extrato.matricula}
            title={extrato.nome}
            description={
              extrato.turmaCodigo ? `Turma ${extrato.turmaCodigo}` : undefined
            }
          >
            <dl className="border-line mb-4 grid gap-4 border-b pb-4 sm:grid-cols-3">
              <div>
                <dt className="text-ink-muted text-sm">Pago</dt>
                <dd className="text-success text-lg font-semibold tabular-nums">
                  {formatCurrency(extrato.totais.pago)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted text-sm">Em aberto</dt>
                <dd className="text-ink text-lg font-semibold tabular-nums">
                  {formatCurrency(extrato.totais.emAberto)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted text-sm">Vencido</dt>
                <dd className="text-danger text-lg font-semibold tabular-nums">
                  {formatCurrency(extrato.totais.vencido)}
                </dd>
              </div>
            </dl>

            <Extrato cobrancas={extrato.cobrancas} podeLancar={false} />
          </Card>
        ))
      )}
    </div>
  );
}
