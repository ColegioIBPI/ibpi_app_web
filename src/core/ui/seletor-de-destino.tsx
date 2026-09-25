"use client";

import {
  ROTULOS_DE_SEGMENTO,
  type Destino,
  type Segmento,
} from "@/core/modelo";
import { SelectField } from "@/core/ui/field";

/**
 * Escolha de "para quem".
 *
 * O mesmo alcance serve aviso e informação útil — toda a comunidade, um
 * segmento, uma turma, um aluno, um responsável. Um seletor só garante que
 * as duas telas ofereçam exatamente as mesmas opções, e que o destino saia
 * montado do mesmo jeito nas duas.
 */

export interface OpcaoDeDestino {
  valor: string;
  rotulo: string;
}

export const ROTULO_DO_TIPO: Record<Destino["tipo"], string> = {
  todos: "Toda a comunidade escolar",
  segmento: "Um segmento",
  turma: "Uma turma",
  aluno: "Um aluno",
  responsavel: "Um responsável",
};

interface SeletorDeDestinoProps {
  tipos: Destino["tipo"][];
  tipo: Destino["tipo"];
  alvo: string;
  turmas: OpcaoDeDestino[];
  alunos: OpcaoDeDestino[];
  responsaveis: OpcaoDeDestino[];
  onTipo: (tipo: Destino["tipo"]) => void;
  onAlvo: (alvo: string) => void;
}

export function SeletorDeDestino({
  tipos,
  tipo,
  alvo,
  turmas,
  alunos,
  responsaveis,
  onTipo,
  onAlvo,
}: SeletorDeDestinoProps) {
  const opcoes = opcoesDoTipo(tipo, turmas, alunos, responsaveis);
  const precisaDeAlvo = tipo !== "todos";

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Destinatário"
          value={tipo}
          onChange={(evento) => {
            onTipo(evento.target.value as Destino["tipo"]);
            // Trocar o tipo invalida o alvo: uma turma não é um segmento.
            onAlvo("");
          }}
        >
          {tipos.map((opcao) => (
            <option key={opcao} value={opcao}>
              {ROTULO_DO_TIPO[opcao]}
            </option>
          ))}
        </SelectField>

        {precisaDeAlvo && (
          <SelectField
            label={ROTULO_DO_TIPO[tipo]}
            value={alvo}
            onChange={(evento) => onAlvo(evento.target.value)}
          >
            <option value="">Selecione…</option>
            {opcoes.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </SelectField>
        )}
      </div>

      {tipo === "turma" && (
        <p className="text-ink-muted mt-3 text-xs">
          A turma alcança os alunos e também os responsáveis deles.
        </p>
      )}
    </>
  );
}

export function opcoesDoTipo(
  tipo: Destino["tipo"],
  turmas: OpcaoDeDestino[],
  alunos: OpcaoDeDestino[],
  responsaveis: OpcaoDeDestino[],
): OpcaoDeDestino[] {
  if (tipo === "turma") return turmas;
  if (tipo === "aluno") return alunos;
  if (tipo === "responsavel") return responsaveis;
  if (tipo === "segmento") {
    return Object.entries(ROTULOS_DE_SEGMENTO).map(([valor, rotulo]) => ({
      valor,
      rotulo,
    }));
  }

  return [];
}

/**
 * Monta o destino a partir do que foi escolhido.
 *
 * `null` quando o alvo não corresponde a nenhuma opção — quem chama trata
 * como "escolha o destinatário", em vez de gravar um destino que não
 * alcança ninguém.
 */
export function montarDestino(
  tipo: Destino["tipo"],
  alvo: string,
  opcoes: OpcaoDeDestino[],
): Destino | null {
  if (tipo === "todos") return { tipo: "todos" };

  const opcao = opcoes.find((item) => item.valor === alvo);
  if (!opcao) return null;

  switch (tipo) {
    case "segmento":
      return { tipo: "segmento", segmento: alvo as Segmento };
    case "turma":
      return { tipo: "turma", turmaId: alvo, turmaCodigo: opcao.rotulo };
    case "aluno":
      return { tipo: "aluno", matricula: alvo, nome: opcao.rotulo };
    case "responsavel":
      return { tipo: "responsavel", responsavelId: alvo, nome: opcao.rotulo };
  }
}
