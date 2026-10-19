"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ROTULOS_DE_SITUACAO_DA_MATRICULA,
  situacaoDaMatriculaSchema,
  type SituacaoDaMatricula,
} from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { SelectField } from "@/core/ui/field";
import { alterarSituacaoEmLote } from "@/features/alunos/actions/situacao";
import { exigeDataPropria } from "@/features/alunos/domain/situacao";

export interface AlunoParaMarcar {
  matricula: string;
  nome: string;
  turmaCodigo: string | null;
  serie: string | null;
  situacaoMatricula: SituacaoDaMatricula;
}

/**
 * Mudança de situação de matrícula em lote.
 *
 * **Nada vem pré-selecionado, e não existe "aplicar à lista filtrada".**
 * Encerrar matrícula é um ato sobre uma pessoa; um botão que agisse sobre
 * o que estivesse na tela encerraria a escola inteira no dia em que alguém
 * esquecesse de filtrar — e o desfazer seria aluno por aluno.
 *
 * O "selecionar todos" existe, mas marca caixas que continuam à vista: a
 * pessoa vê os trinta nomes antes de confirmar.
 */
export function MudancaDeSituacao({ alunos }: { alunos: AlunoParaMarcar[] }) {
  const router = useRouter();

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [situacao, setSituacao] = useState<SituacaoDaMatricula>("concluida");
  const [data, setData] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const precisaDeData = exigeDataPropria(situacao);
  const todosMarcados =
    alunos.length > 0 && selecionados.size === alunos.length;

  function alternar(matricula: string) {
    setSelecionados((atuais) => {
      const proximos = new Set(atuais);
      if (proximos.has(matricula)) proximos.delete(matricula);
      else proximos.add(matricula);
      return proximos;
    });
  }

  async function aplicar() {
    setErro(null);
    setAviso(null);
    setSalvando(true);

    try {
      const resultado = await alterarSituacaoEmLote({
        matriculas: [...selecionados],
        situacaoMatricula: situacao,
        dataDaSituacao: data || null,
      });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível alterar.");
        return;
      }

      setAviso(
        resultado.alterados === 0
          ? "Nenhum aluno mudou — todos já estavam nessa situação."
          : `${resultado.alterados} ${resultado.alterados === 1 ? "aluno alterado" : "alunos alterados"}.`,
      );
      setSelecionados(new Set());
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
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

      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField
          label="Nova situação"
          value={situacao}
          onChange={(evento) =>
            setSituacao(evento.target.value as SituacaoDaMatricula)
          }
        >
          {situacaoDaMatriculaSchema.options.map((opcao) => (
            <option key={opcao} value={opcao}>
              {ROTULOS_DE_SITUACAO_DA_MATRICULA[opcao]}
            </option>
          ))}
        </SelectField>

        <div className="flex flex-col gap-1">
          {/*
            A dica fica **fora** do `<label>`: dentro, ela entra no nome
            acessível do campo, e o leitor de tela anuncia "Data de
            conclusão, é esta data que aparece na ata" como se fosse o
            rótulo.
          */}
          <label className="flex flex-col gap-1">
            <span className="text-ink text-sm font-medium">
              {rotuloDaData(situacao)}
              {precisaDeData && <span className="text-danger"> *</span>}
            </span>
            <input
              type="date"
              value={data}
              disabled={!precisaDeData}
              onChange={(evento) => setData(evento.target.value)}
              className="border-line bg-surface text-ink disabled:bg-surface-subtle h-10 rounded-md border px-3 text-sm"
            />
          </label>
          <span className="text-ink-muted text-xs">
            {precisaDeData
              ? "É esta data que aparece na ata."
              : "Matrícula ativa não tem data de mudança."}
          </span>
        </div>

        <div className="flex items-end">
          <Button
            onClick={aplicar}
            loading={salvando}
            disabled={selecionados.size === 0}
          >
            Aplicar a {selecionados.size}{" "}
            {selecionados.size === 1 ? "aluno" : "alunos"}
          </Button>
        </div>
      </div>

      <div className="border-line flex items-center justify-between gap-3 border-t pt-3">
        <span className="text-ink-muted text-sm">
          {alunos.length} {alunos.length === 1 ? "aluno" : "alunos"} na lista
        </span>

        <Button
          variant="secondary"
          size="sm"
          disabled={alunos.length === 0}
          onClick={() =>
            setSelecionados(
              todosMarcados
                ? new Set()
                : new Set(alunos.map((aluno) => aluno.matricula)),
            )
          }
        >
          {todosMarcados ? "Limpar seleção" : "Selecionar todos"}
        </Button>
      </div>

      <ul className="divide-line divide-y">
        {alunos.map((aluno) => (
          <li key={aluno.matricula}>
            <label className="flex items-center gap-3 py-2 text-sm">
              <input
                type="checkbox"
                className="border-line size-4 rounded"
                checked={selecionados.has(aluno.matricula)}
                onChange={() => alternar(aluno.matricula)}
              />
              <span className="flex-1">
                <span className="text-ink">{aluno.nome}</span>
                <span className="text-ink-muted block text-xs">
                  {aluno.matricula}
                  {aluno.turmaCodigo ? ` · ${aluno.turmaCodigo}` : ""}
                  {aluno.serie ? ` · ${aluno.serie}` : ""}
                </span>
              </span>
              <span className="text-ink-muted text-xs whitespace-nowrap">
                {ROTULOS_DE_SITUACAO_DA_MATRICULA[aluno.situacaoMatricula]}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {alunos.length === 0 && (
        <p className="text-ink-muted text-sm">
          Nenhum aluno nesta situação. Troque o filtro acima.
        </p>
      )}
    </div>
  );
}

function rotuloDaData(situacao: SituacaoDaMatricula): string {
  if (situacao === "concluida") return "Data de conclusão";
  if (situacao === "transferida") return "Data de transferência";
  if (situacao === "cancelada") return "Data de cancelamento";
  if (situacao === "abandono") return "Data do abandono";

  return "Data";
}
