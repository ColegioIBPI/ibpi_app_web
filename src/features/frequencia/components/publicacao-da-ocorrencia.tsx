"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { alterarPublicacao } from "@/features/frequencia/actions/ocorrencias";
import {
  visivelParaAluno,
  visivelParaResponsavel,
  type ParaPublicacao,
} from "@/features/frequencia/domain/publicacao";

/**
 * Quem vê a ocorrência, editável na própria lista.
 *
 * Cada caixa grava sozinha, sem botão de salvar: é uma decisão de uma
 * tecla, quase sempre tomada no meio de outra conversa, e um formulário
 * que só persiste no fim perderia a mudança de quem foi interrompido.
 *
 * As duas ficam **desabilitadas enquanto grava** e o estado só muda quando
 * o servidor confirma — marcar na hora mostraria por um instante um
 * "responsável vê" que talvez não exista, e é isso que a pessoa olha antes
 * de atender a família.
 */
export function PublicacaoDaOcorrencia({
  id,
  ocorrencia,
  podeEditar,
}: {
  id: string;
  ocorrencia: ParaPublicacao;
  podeEditar: boolean;
}) {
  const router = useRouter();

  const responsavel = visivelParaResponsavel(ocorrencia);
  const aluno = visivelParaAluno(ocorrencia);

  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternar(mudanca: {
    visivelParaResponsavel?: boolean;
    visivelParaAluno?: boolean;
  }) {
    setErro(null);
    setGravando(true);

    try {
      const resultado = await alterarPublicacao({
        id,
        // O estado atual já traz o padrão da ocorrência antiga resolvido,
        // então gravar um lado **fixa o outro** como está na tela — e não
        // como `undefined`, que voltaria ao padrão sem ninguém pedir.
        visivelParaResponsavel: responsavel,
        visivelParaAluno: aluno,
        ...mudanca,
      });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível alterar.");
        return;
      }

      router.refresh();
    } finally {
      setGravando(false);
    }
  }

  if (!podeEditar) {
    return (
      <span className="text-ink-muted text-xs whitespace-nowrap">
        {responsavel || aluno
          ? `Visível: ${[responsavel && "responsável", aluno && "aluno"].filter(Boolean).join(" e ")}`
          : "Só a equipe"}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 text-xs whitespace-nowrap">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            className="border-line size-3.5 rounded"
            checked={responsavel}
            disabled={gravando}
            onChange={(evento) =>
              alternar({ visivelParaResponsavel: evento.target.checked })
            }
          />
          <span className="text-ink-muted">Responsável</span>
        </label>

        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            className="border-line size-3.5 rounded"
            checked={aluno}
            disabled={gravando}
            onChange={(evento) =>
              alternar({ visivelParaAluno: evento.target.checked })
            }
          />
          <span className="text-ink-muted">Aluno</span>
        </label>
      </div>

      {erro && (
        <span role="alert" className="text-danger text-xs">
          {erro}
        </span>
      )}
    </div>
  );
}
