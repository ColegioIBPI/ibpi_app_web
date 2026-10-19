import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirArea } from "@/core/auth/guards";
import { rotuloDoPerfil } from "@/core/auth/roles";
import { Card } from "@/core/ui/card";
import type { Gravidade } from "@/features/painel/domain/pendencias";
import { montarPainel } from "@/features/painel/services/painel.server";

export const metadata: Metadata = { title: "Gestão" };

/**
 * A tela inicial.
 *
 * Antes listava os módulos do perfil — informação que o menu lateral já
 * dá, ao lado. O que falta a quem abre o sistema de manhã é outra coisa:
 * **o que está parado esperando**.
 *
 * Cada cartão é uma pendência com um caminho para resolvê-la. Pendência
 * zerada não vira cartão: painel cheio de zero ensina a ignorar painel.
 */
export default async function GestaoPage() {
  const sessao = await exigirArea("gestao");
  const painel = await montarPainel(sessao);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">
          Olá, {primeiroNome(sessao)}
        </h1>
        <p className="text-ink-muted mt-1 text-sm">
          {rotuloDoPerfil(sessao.role)} · Ano letivo de {painel.anoLetivo} ·{" "}
          {painel.trimestre}º trimestre
        </p>
      </div>

      {painel.pendencias.length === 0 ? (
        <Card>
          <div className="flex items-center gap-3 py-2">
            <CheckCircle2 className="text-success size-5" aria-hidden />
            <div>
              <p className="text-ink text-sm font-medium">Nada esperando você</p>
              <p className="text-ink-muted text-sm">
                Sem pedido na fila, chamada pendente ou boletim por liberar.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {painel.pendencias.map((pendencia) => (
            <Link
              key={pendencia.chave}
              href={pendencia.href}
              className="focus-visible:outline-brand-600 rounded-card block focus-visible:outline-2"
            >
              <Card className="hover:border-brand-600 h-full transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-ink-muted text-sm">{pendencia.titulo}</p>
                    <p
                      className={`mt-1 text-2xl font-semibold tabular-nums ${COR[pendencia.gravidade]}`}
                    >
                      {pendencia.valor}
                    </p>
                    {pendencia.detalhe && (
                      <p className="text-ink-muted mt-1 text-xs">
                        {pendencia.detalhe}
                      </p>
                    )}
                  </div>

                  <ArrowRight
                    className="text-ink-muted mt-1 size-4 shrink-0"
                    aria-hidden
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {painel.numeros.length > 0 && (
        <Card>
          <dl className="grid gap-4 sm:grid-cols-4">
            {painel.numeros.map((numero) => (
              <div key={numero.rotulo}>
                <dt className="text-ink-muted text-sm">{numero.rotulo}</dt>
                <dd className="text-ink text-lg font-semibold tabular-nums">
                  {numero.valor}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
    </div>
  );
}

/**
 * A cor é do que a pendência custa, não do número.
 *
 * Vermelho para o que tem prazo e não volta atrás — reprovação por falta,
 * dívida vencida. O resto espera sem piorar.
 */
const COR: Record<Gravidade, string> = {
  alta: "text-danger",
  media: "text-ink",
  baixa: "text-ink-muted",
};

function primeiroNome({ nome, email }: { nome: string; email: string }) {
  return nome.trim().split(/\s+/)[0] || email;
}
