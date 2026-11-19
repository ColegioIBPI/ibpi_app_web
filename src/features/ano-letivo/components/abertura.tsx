"use client";

import { ArrowRight, Copy, TriangleAlert, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { SelectField } from "@/core/ui/field";
import {
  copiarEstrutura,
  passarAlunosDeTurma,
} from "@/features/ano-letivo/actions/abertura";

export interface TurmaDaAbertura {
  id: string;
  codigo: string;
  /** Quantos alunos com matrícula ativa naquele ano. */
  alunos: number;
}

export interface AlunoDaTurma {
  matricula: string;
  nome: string;
}

/**
 * Abrir o ano letivo, em duas fases.
 *
 * A separação é a mensagem: copiar a estrutura é seguro e dá para
 * repetir; **passar os alunos move gente de verdade**, e a partir dela a
 * chamada e o diário enxergam a turma nova.
 *
 * Por isso a segunda fase é turma a turma, com o destino escolhido à mão.
 * Promover não é conta: é decisão da escola, e um botão "passar todo
 * mundo" tiraria dela a única parte que ela precisa pensar.
 */
export function AberturaDoAno({
  anoBase,
  anoNovo,
  turmasDoAnoBase,
  turmasDoAnoNovo,
  alunosPorTurma,
}: {
  anoBase: number;
  anoNovo: number;
  turmasDoAnoBase: TurmaDaAbertura[];
  turmasDoAnoNovo: TurmaDaAbertura[];
  alunosPorTurma: Record<string, AlunoDaTurma[]>;
}) {
  const router = useRouter();

  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function executar(
    acao: () => Promise<{ ok: boolean; erro?: string }>,
    sucesso: (r: Awaited<ReturnType<typeof copiarEstrutura>>) => string,
  ) {
    setErro(null);
    setAviso(null);
    setOcupado(true);

    try {
      const resultado = await acao();

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível concluir.");
        return;
      }

      setAviso(sucesso(resultado));
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  const faltamTurmas = turmasDoAnoNovo.length === 0;

  /*
    Ano novo com menos turmas que o base é estrutura pela metade. Pode
    ser legítimo — uma turma que fecha —, e por isso avisa em vez de
    travar. Mas é o sinal de que o passo 1 não rodou.
  */
  const estruturaIncompleta =
    !faltamTurmas && turmasDoAnoNovo.length < turmasDoAnoBase.length;

  return (
    <div className="flex flex-col gap-6">
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

      <Card
        title={`1. Estrutura de ${anoNovo}`}
        description={`Copia as turmas e os vínculos de ${anoBase}. Pode rodar quantas vezes quiser — o que já existe não é duplicado, e ${anoBase} não muda.`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-ink-muted text-sm">
            {turmasDoAnoNovo.length === 0
              ? `${anoNovo} ainda não tem turma nenhuma.`
              : `${anoNovo} já tem ${turmasDoAnoNovo.length} ${
                  turmasDoAnoNovo.length === 1 ? "turma" : "turmas"
                }.`}
          </p>

          <Button
            loading={ocupado}
            onClick={() =>
              executar(
                () => copiarEstrutura({ anoBase, anoNovo }),
                (r) =>
                  r.turmas === 0 && r.vinculos === 0
                    ? "Nada a copiar: a estrutura já estava completa."
                    : `Criadas ${r.turmas} turmas e ${r.vinculos} vínculos em ${anoNovo}.`,
              )
            }
          >
            <Copy className="size-4" aria-hidden />
            Copiar estrutura de {anoBase}
          </Button>
        </div>

        <p className="text-ink-muted mt-3 text-xs">
          Os vínculos vêm como sugestão — o quadro do ano seguinte quase
          sempre muda, e corrigir é menos trabalho que montar do zero.
        </p>
      </Card>

      <Card
        title={`2. Alunos de ${anoBase} para ${anoNovo}`}
        description="Turma por turma, escolhendo para onde cada uma vai. Só entram alunos com matrícula ativa."
      >
        {faltamTurmas ? (
          <p className="text-ink-muted text-sm">
            Copie a estrutura primeiro: sem turmas em {anoNovo} não há para
            onde passar.
          </p>
        ) : (
          <>
            {/*
              O aviso existe porque o estrago já aconteceu: com uma única
              turma em {anoNovo}, a 3ª série e o 9º ano foram parar os dois
              na mesma EM1A. O menu de destino oferecia uma opção só, e uma
              opção só não parece escolha errada — parece a única.
            */}
            {estruturaIncompleta && (
              <p
                role="alert"
                className="border-danger bg-danger-surface text-danger mb-4 flex gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  <strong>
                    A estrutura de {anoNovo} está incompleta: {turmasDoAnoNovo.length}{" "}
                    {turmasDoAnoNovo.length === 1 ? "turma" : "turmas"} para as{" "}
                    {turmasDoAnoBase.length} de {anoBase}.
                  </strong>{" "}
                  Copie a estrutura acima antes de passar alunos. Com poucos
                  destinos, turmas diferentes acabam na mesma — e desfazer
                  isso é trabalho manual.
                </span>
              </p>
            )}

            <p className="border-warning bg-warning-surface text-warning mb-4 flex gap-2 rounded-md border px-3 py-2 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Isto <strong>move o aluno</strong>: a partir daqui ele
                aparece na chamada e no diário da turma de {anoNovo}. O
                boletim, as notas e a ata de {anoBase} continuam onde estão.
              </span>
            </p>

            <ul className="divide-line divide-y">
              {turmasDoAnoBase.map((turma) => (
                <PassagemDeTurma
                  key={turma.id}
                  turma={turma}
                  destinos={turmasDoAnoNovo}
                  alunos={alunosPorTurma[turma.id] ?? []}
                  ocupado={ocupado}
                  onPassar={(destino, matriculas) =>
                    executar(
                      () =>
                        passarAlunosDeTurma({
                          anoBase,
                          anoNovo,
                          turmaDeOrigem: turma.id,
                          turmaDeDestino: destino,
                          matriculas,
                        }),
                      (r) =>
                        `${r.alunos} ${
                          r.alunos === 1 ? "aluno passou" : "alunos passaram"
                        } para ${anoNovo}.`,
                    )
                  }
                />
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

function PassagemDeTurma({
  turma,
  destinos,
  alunos,
  ocupado,
  onPassar,
}: {
  turma: TurmaDaAbertura;
  destinos: TurmaDaAbertura[];
  alunos: AlunoDaTurma[];
  ocupado: boolean;
  onPassar: (destino: string, matriculas: string[]) => void;
}) {
  const [destino, setDestino] = useState("");
  const [fora, setFora] = useState<string[]>([]);

  const vao = alunos.filter((aluno) => !fora.includes(aluno.matricula));

  if (alunos.length === 0) {
    return (
      <li className="flex items-center justify-between gap-3 py-3 text-sm">
        <span className="text-ink">{turma.codigo}</span>
        <span className="text-ink-muted text-xs">
          Ninguém para passar — ou já passaram
        </span>
      </li>
    );
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-32">
          <p className="text-ink text-sm font-medium">{turma.codigo}</p>
          <p className="text-ink-muted text-xs">
            {vao.length} de {alunos.length}{" "}
            {alunos.length === 1 ? "aluno" : "alunos"}
          </p>
        </div>

        <ArrowRight className="text-ink-muted mb-2 size-4" aria-hidden />

        <div className="min-w-40 flex-1">
          <SelectField
            label={`Destino de ${turma.codigo}`}
            value={destino}
            onChange={(evento) => setDestino(evento.target.value)}
          >
            <option value="">Não passar esta turma</option>
            {destinos.map((item) => (
              <option key={item.id} value={item.id}>
                {item.codigo}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="flex items-end pb-1">
          <Button
            size="sm"
            loading={ocupado}
            disabled={!destino || vao.length === 0}
            onClick={() =>
              onPassar(
                destino,
                vao.map((aluno) => aluno.matricula),
              )
            }
          >
            <Users className="size-4" aria-hidden />
            Passar {vao.length}
          </Button>
        </div>
      </div>

      {/*
        Os nomes ficam num `<details>`: a secretaria passa a turma
        inteira na maioria das vezes, e a lista aberta em dez turmas
        tornaria a tela ilegível. Quem precisa tirar um aluno abre.
      */}
      <details className="mt-2">
        <summary className="text-ink-muted cursor-pointer text-xs">
          Escolher quem passa
        </summary>

        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {alunos.map((aluno) => (
            <li key={aluno.matricula}>
              <label className="text-ink flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-brand-600 size-4"
                  checked={!fora.includes(aluno.matricula)}
                  onChange={(evento) =>
                    setFora((atuais) =>
                      evento.target.checked
                        ? atuais.filter((m) => m !== aluno.matricula)
                        : [...atuais, aluno.matricula],
                    )
                  }
                />
                {aluno.nome}
              </label>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}
