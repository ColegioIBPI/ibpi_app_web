"use client";

import { Download } from "lucide-react";
import { useState } from "react";

/**
 * Valores a receber até uma data.
 *
 * A data fica **ao lado do botão**, e não numa tela à parte: o relatório é
 * sempre pedido com uma data na cabeça ("quanto entra até o dia 30"), e
 * abrir outra tela para digitá-la seria um clique a mais para a mesma
 * pergunta.
 *
 * O botão é uma âncora com `download`, como as outras exportações: o
 * navegador já sabe baixar, e funciona antes de o JavaScript carregar.
 */
export function ValoresAReceber({ turma }: { turma?: string }) {
  const [ate, setAte] = useState(fimDoMes());

  const parametros = new URLSearchParams({ ate });
  if (turma) parametros.set("turma", turma);

  return (
    <div className="flex flex-wrap items-end gap-2" data-impressao="ocultar">
      <label className="flex flex-col gap-1">
        <span className="text-ink-muted text-xs">Receber até</span>
        <input
          type="date"
          value={ate}
          onChange={(evento) => setAte(evento.target.value)}
          className="border-line bg-surface text-ink h-10 rounded-md border px-3 text-sm"
        />
      </label>

      <a
        href={`/api/exportacoes/valores-a-receber?${parametros.toString()}`}
        download
        className="border-line bg-surface text-ink hover:bg-surface-subtle inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium"
      >
        <Download className="size-4" aria-hidden />
        Valores a receber
      </a>
    </div>
  );
}

/**
 * O fim do mês corrente como padrão.
 *
 * É o recorte que a pergunta costuma ter. Dia 0 do mês seguinte é o último
 * dia deste — e a conta do fim de mês acerta fevereiro sem tabela.
 */
function fimDoMes(): string {
  const hoje = new Date();
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const mes = String(ultimo.getMonth() + 1).padStart(2, "0");
  const dia = String(ultimo.getDate()).padStart(2, "0");

  return `${ultimo.getFullYear()}-${mes}-${dia}`;
}
