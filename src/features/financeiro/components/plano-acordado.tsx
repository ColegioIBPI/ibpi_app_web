"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatDate } from "@/core/lib/format";
import { Button } from "@/core/ui/button";
import { TextAreaField } from "@/core/ui/field";
import { salvarPlanoAcordado } from "@/features/financeiro/actions/financeiro";
import type { PlanoDePagamento } from "@/core/modelo";

/**
 * O plano de pagamento acordado no ato da matrícula.
 *
 * Texto livre de propósito: negociação de matrícula tem desconto, condição e
 * combinado que nenhum campo estruturado acomoda sem virar um "observações"
 * com outro nome. O carnê, que é o que o sistema calcula, está nas parcelas;
 * aqui fica o que a escola prometeu, para quem atender a família depois
 * saber o que foi combinado.
 */
export function PlanoAcordado({
  matricula,
  plano,
  podeLancar,
}: {
  matricula: string;
  plano: PlanoDePagamento | null;
  podeLancar: boolean;
}) {
  const router = useRouter();

  const [texto, setTexto] = useState(plano?.texto ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!podeLancar) {
    return plano ? (
      <>
        <p className="text-ink text-sm whitespace-pre-wrap">{plano.texto}</p>
        <Assinatura plano={plano} />
      </>
    ) : (
      <p className="text-ink-muted text-sm">
        Nenhum plano registrado para este aluno.
      </p>
    );
  }

  async function salvar() {
    setErro(null);
    setAviso(null);
    setSalvando(true);

    try {
      const resultado = await salvarPlanoAcordado({ matricula, texto });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível salvar.");
        return;
      }

      setAviso("Plano salvo.");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {erro && (
        <p
          role="alert"
          className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}

      {aviso && (
        <p className="border-line bg-surface-subtle text-ink-muted rounded-md border px-3 py-2 text-sm">
          {aviso}
        </p>
      )}

      <TextAreaField
        label="Plano acordado"
        rows={6}
        placeholder={
          "Ex.: Anuidade de R$ 23.076,00 em 12x de R$ 1.923,00, vencendo todo dia 5.\n" +
          "Desconto de 10% para pagamento até o vencimento.\n" +
          "Taxa de material paga à vista na matrícula."
        }
        hint="Registro interno: não aparece para a família no Portal nem no aplicativo."
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
      />

      {plano && <Assinatura plano={plano} />}

      <div className="flex justify-end">
        <Button onClick={salvar} loading={salvando}>
          Salvar plano
        </Button>
      </div>
    </div>
  );
}

function Assinatura({ plano }: { plano: PlanoDePagamento }) {
  return (
    <p className="text-ink-muted text-xs">
      Atualizado por {plano.atualizadoPorNome ?? "—"}
      {plano.atualizadoEm ? ` em ${formatDate(plano.atualizadoEm)}` : ""}
    </p>
  );
}
