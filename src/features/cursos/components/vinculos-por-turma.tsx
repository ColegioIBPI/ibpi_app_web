"use client";

import { ArrowLeftRight, Link2Off, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { SelectField } from "@/core/ui/field";
import {
  alocarProfessor,
  removerAlocacao,
  trocarProfessor,
} from "@/features/professores/actions/professores";

export interface TurmaComVinculos {
  id: string;
  codigo: string;
  anoLetivo: number;
  cursoRotulo: string;
  vinculos: Array<{
    id: string;
    disciplinaId: string;
    disciplinaNome: string;
    professorId: string;
    professorNome: string;
  }>;
}

export interface Opcao {
  valor: string;
  rotulo: string;
}

/**
 * Quem leciona o quê, **turma por turma**.
 *
 * A mesma alocação já era feita na ficha do professor, e continua lá. Esta
 * tela existe porque em janeiro a pergunta é a outra: não "em que turmas o
 * Juarez dá aula", e sim "esta turma já tem professor em todas as
 * disciplinas?". A primeira pergunta se responde um professor por vez; a
 * segunda, só olhando a turma inteira.
 *
 * As ações são as mesmas de lá — `alocarProfessor` e `removerAlocacao` —,
 * porque duas gravações do mesmo vínculo é como as duas telas passam a
 * discordar sobre o que é duplicata.
 */
export function VinculosPorTurma({
  turmas,
  professores,
  disciplinas,
}: {
  turmas: TurmaComVinculos[];
  professores: Opcao[];
  disciplinas: Opcao[];
}) {
  const router = useRouter();

  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  /** O vínculo com o painel de troca aberto. Um de cada vez. */
  const [trocando, setTrocando] = useState<string | null>(null);

  async function executar(acao: () => Promise<{ ok: boolean; erro?: string }>) {
    setErro(null);
    setOcupado(true);

    try {
      const resultado = await acao();

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível salvar.");
        return;
      }

      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  if (turmas.length === 0) {
    return (
      <Card>
        <p className="text-ink text-sm">
          Nenhuma turma cadastrada neste ano letivo. Crie a turma antes de
          vincular professor e disciplina.
        </p>
      </Card>
    );
  }

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

      {turmas.map((turma) => (
        <Card
          key={turma.id}
          title={turma.codigo}
          description={`${turma.cursoRotulo} · ${turma.anoLetivo}`}
        >
          {turma.vinculos.length === 0 ? (
            <p className="text-ink-muted text-sm">
              Nenhuma disciplina vinculada. Sem vínculo, nenhum professor
              enxerga os alunos desta turma.
            </p>
          ) : (
            <ul className="divide-line divide-y text-sm">
              {turma.vinculos.map((vinculo) => (
                <li key={vinculo.id} className="py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-ink">{vinculo.disciplinaNome}</span>
                      <Link
                        href={`/gestao/professores/${vinculo.professorId}`}
                        className="text-brand-600 ml-2 hover:underline"
                      >
                        {vinculo.professorNome}
                      </Link>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={ocupado}
                        onClick={() =>
                          setTrocando(trocando === vinculo.id ? null : vinculo.id)
                        }
                        aria-expanded={trocando === vinculo.id}
                      >
                        <ArrowLeftRight className="size-4" aria-hidden />
                        Trocar professor
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={ocupado}
                        onClick={() =>
                          executar(() =>
                            removerAlocacao(vinculo.professorId, vinculo.id),
                          )
                        }
                      >
                        <Link2Off className="size-4" aria-hidden />
                        Desvincular
                      </Button>
                    </div>
                  </div>

                  {trocando === vinculo.id && (
                    <TrocaDeProfessor
                      vinculo={vinculo}
                      professores={professores}
                      ocupado={ocupado}
                      onTrocar={async (novoProfessorId) => {
                        await executar(() =>
                          trocarProfessor(vinculo.id, novoProfessorId),
                        );
                        setTrocando(null);
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}

          <NovoVinculo
            turma={turma}
            professores={professores}
            disciplinas={disciplinas}
            ocupado={ocupado}
            onVincular={(professorId, disciplinaId, disciplinaNome) =>
              executar(() =>
                alocarProfessor(professorId, {
                  turmaId: turma.id,
                  turmaCodigo: turma.codigo,
                  disciplinaId,
                  disciplinaNome,
                  anoLetivo: turma.anoLetivo,
                }),
              )
            }
          />
        </Card>
      ))}
    </div>
  );
}

/**
 * Trocar o professor de uma disciplina, num passo.
 *
 * Antes eram dois — vincular o novo, desvincular o antigo —, e **na ordem
 * errada a disciplina sumia do boletim** até o vínculo novo entrar. Nada
 * se perdia, mas assustava. Uma ação só não tem ordem para errar.
 *
 * O texto embaixo responde a pergunta que a escola fez antes de pedir
 * isto: "perde o que o professor anterior lançou?". Ele fica **aqui**, no
 * momento da decisão, e não só no manual — a dúvida aparece com o dedo
 * sobre o botão.
 */
function TrocaDeProfessor({
  vinculo,
  professores,
  ocupado,
  onTrocar,
}: {
  vinculo: { id: string; disciplinaNome: string; professorId: string };
  professores: Opcao[];
  ocupado: boolean;
  onTrocar: (novoProfessorId: string) => void;
}) {
  const [novoProfessorId, setNovoProfessorId] = useState("");

  // Quem já leciona sai da lista: a ação recusaria, e oferecer o que vai
  // ser recusado é convidar ao erro — a mesma regra do formulário de
  // vínculo novo.
  const disponiveis = professores.filter(
    (professor) => professor.valor !== vinculo.professorId,
  );

  return (
    <div className="border-line bg-surface-subtle mt-3 rounded-md border p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <SelectField
          label={`Novo professor de ${vinculo.disciplinaNome}`}
          value={novoProfessorId}
          onChange={(evento) => setNovoProfessorId(evento.target.value)}
        >
          <option value="">Selecione…</option>
          {disponiveis.map((professor) => (
            <option key={professor.valor} value={professor.valor}>
              {professor.rotulo}
            </option>
          ))}
        </SelectField>

        <div className="flex items-end pb-1">
          <Button
            size="sm"
            loading={ocupado}
            disabled={!novoProfessorId}
            onClick={() => onTrocar(novoProfessorId)}
          >
            <ArrowLeftRight className="size-4" aria-hidden />
            Trocar
          </Button>
        </div>
      </div>

      <p className="text-ink-muted mt-2 text-xs">
        As notas, a chamada e as ocorrências continuam — elas são da turma e
        da disciplina, não do professor. O diário do anterior fica em
        leitura dentro do diário novo, e o acesso dele a esta turma sai
        junto.
      </p>
    </div>
  );
}

function NovoVinculo({
  turma,
  professores,
  disciplinas,
  ocupado,
  onVincular,
}: {
  turma: TurmaComVinculos;
  professores: Opcao[];
  disciplinas: Opcao[];
  ocupado: boolean;
  onVincular: (
    professorId: string,
    disciplinaId: string,
    disciplinaNome: string,
  ) => void;
}) {
  const [disciplinaId, setDisciplinaId] = useState("");
  const [professorId, setProfessorId] = useState("");

  // Disciplina já vinculada nesta turma sai da lista: a ação recusaria a
  // duplicata, e oferecer o que vai ser recusado é convidar ao erro.
  const disponiveis = disciplinas.filter(
    (disciplina) =>
      !turma.vinculos.some((v) => v.disciplinaId === disciplina.valor),
  );

  return (
    <div className="border-line mt-4 grid gap-3 border-t pt-4 sm:grid-cols-[1fr_1fr_auto]">
      <SelectField
        label="Disciplina"
        value={disciplinaId}
        onChange={(evento) => setDisciplinaId(evento.target.value)}
      >
        <option value="">Selecione…</option>
        {disponiveis.map((disciplina) => (
          <option key={disciplina.valor} value={disciplina.valor}>
            {disciplina.rotulo}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Professor"
        value={professorId}
        onChange={(evento) => setProfessorId(evento.target.value)}
      >
        <option value="">Selecione…</option>
        {professores.map((professor) => (
          <option key={professor.valor} value={professor.valor}>
            {professor.rotulo}
          </option>
        ))}
      </SelectField>

      <div className="flex items-end pb-1">
        <Button
          size="sm"
          loading={ocupado}
          disabled={!disciplinaId || !professorId}
          onClick={() => {
            const disciplina = disponiveis.find(
              (atual) => atual.valor === disciplinaId,
            );
            if (!disciplina) return;

            onVincular(professorId, disciplinaId, disciplina.rotulo);
            setDisciplinaId("");
            setProfessorId("");
          }}
        >
          <Plus className="size-4" aria-hidden />
          Vincular
        </Button>
      </div>
    </div>
  );
}
