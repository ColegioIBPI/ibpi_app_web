"use client";

import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/core/ui/button";
import { TextField } from "@/core/ui/field";
import { Modal } from "@/core/ui/modal";
import { EmptyState } from "@/core/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/core/ui/table";
import { salvarDisciplina } from "@/features/turmas/actions/salvar";
import type { DisciplinaComId } from "@/features/turmas/services/turmas.server";

interface GestaoDeDisciplinasProps {
  disciplinas: DisciplinaComId[];
  podeEditar: boolean;
}

/**
 * Disciplina tem três campos. Abrir uma página só para isso seria mais
 * clique que conteúdo — o cadastro acontece num diálogo, sem sair da lista.
 */
export function GestaoDeDisciplinas({
  disciplinas,
  podeEditar,
}: GestaoDeDisciplinasProps) {
  const router = useRouter();
  const [emEdicao, setEmEdicao] = useState<DisciplinaComId | null>(null);
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [ativa, setAtiva] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const aberto = criando || emEdicao !== null;

  function abrirNova() {
    setEmEdicao(null);
    setNome("");
    setSigla("");
    setAtiva(true);
    setErro(null);
    setCriando(true);
  }

  function abrirEdicao(disciplina: DisciplinaComId) {
    setCriando(false);
    setEmEdicao(disciplina);
    setNome(disciplina.nome);
    setSigla(disciplina.sigla ?? "");
    setAtiva(disciplina.ativa);
    setErro(null);
  }

  function fechar() {
    setCriando(false);
    setEmEdicao(null);
    setErro(null);
  }

  async function salvar() {
    setErro(null);
    setSalvando(true);

    const resultado = await salvarDisciplina(emEdicao?.id ?? null, {
      nome,
      sigla,
      ativa,
    });

    setSalvando(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível salvar.");
      return;
    }

    fechar();
    router.refresh();
  }

  return (
    <>
      {podeEditar && (
        <div className="mb-4 flex justify-end">
          <Button onClick={abrirNova}>
            <Plus className="size-4" aria-hidden />
            Nova disciplina
          </Button>
        </div>
      )}

      {disciplinas.length === 0 ? (
        <EmptyState
          title="Nenhuma disciplina cadastrada"
          description="As disciplinas alimentam o diário de classe e o boletim."
        />
      ) : (
        <Table caption="Disciplinas do colégio">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Disciplina</TableHeaderCell>
              <TableHeaderCell>Sigla</TableHeaderCell>
              <TableHeaderCell>Situação</TableHeaderCell>
              {podeEditar && (
                <TableHeaderCell>
                  <span className="sr-only">Ações</span>
                </TableHeaderCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {disciplinas.map((disciplina) => (
              <TableRow key={disciplina.id}>
                <TableCell>
                  <span className="text-ink font-medium">
                    {disciplina.nome}
                  </span>
                  {disciplina.grafiasOriginais?.length > 1 && (
                    <span
                      className="text-ink-muted ml-2 text-xs"
                      title={disciplina.grafiasOriginais.join(" · ")}
                    >
                      {disciplina.grafiasOriginais.length} grafias consolidadas
                    </span>
                  )}
                </TableCell>
                <TableCell>{disciplina.sigla ?? "—"}</TableCell>
                <TableCell>{disciplina.ativa ? "Ativa" : "Inativa"}</TableCell>
                {podeEditar && (
                  <TableCell className="text-right">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(disciplina)}
                      className="text-brand-600 inline-flex items-center gap-1 text-sm hover:underline"
                    >
                      <Pencil className="size-3.5" aria-hidden />
                      Editar
                    </button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Modal
        open={aberto}
        title={emEdicao ? "Editar disciplina" : "Nova disciplina"}
        onClose={fechar}
        footer={
          <>
            <Button variant="secondary" onClick={fechar}>
              Cancelar
            </Button>
            <Button onClick={salvar} loading={salvando}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {erro && (
            <p
              role="alert"
              className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
            >
              {erro}
            </p>
          )}

          <TextField
            label="Nome"
            required
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
          />
          <TextField
            label="Sigla"
            value={sigla}
            onChange={(evento) => setSigla(evento.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="border-line size-4 rounded"
              checked={ativa}
              onChange={(evento) => setAtiva(evento.target.checked)}
            />
            <span className="text-ink">Disciplina ativa</span>
          </label>

          {!emEdicao && (
            <p className="text-ink-muted text-xs">
              O identificador vem do nome sem acento — é o que impede a mesma
              matéria de entrar duas vezes com grafias diferentes.
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
