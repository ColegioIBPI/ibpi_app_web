"use client";

import { KeyRound, Link2Off, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/core/ui/button";
import { SelectField } from "@/core/ui/field";
import { EmptyState } from "@/core/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/core/ui/table";
import { enviarEmailDeSenha } from "@/features/auth/services/auth-client";
import {
  alocarProfessor,
  criarAcessoDoProfessor,
  removerAlocacao,
} from "@/features/professores/actions/professores";
import { motivoParaNaoCriarAcesso } from "@/features/professores/domain/alocacoes";
import type {
  AlocacaoComId,
  ProfessorComId,
} from "@/features/professores/services/professores.server";

interface Opcao {
  valor: string;
  rotulo: string;
  anoLetivo?: number;
}

interface AlocacoesProps {
  professor: ProfessorComId;
  alocacoes: AlocacaoComId[];
  turmas: Opcao[];
  disciplinas: Opcao[];
}

/**
 * Alocações do professor e o acesso dele.
 *
 * Ficam juntos porque a alocação **é** o escopo do acesso: sem turma, o
 * professor entra e não enxerga aluno nenhum.
 */
export function Alocacoes({
  professor,
  alocacoes,
  turmas,
  disciplinas,
}: AlocacoesProps) {
  const router = useRouter();
  const [turmaId, setTurmaId] = useState("");
  const [disciplinaId, setDisciplinaId] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const ativas = alocacoes.filter((a) => a.ativa !== false);
  const impedimento = motivoParaNaoCriarAcesso({
    nome: professor.nome,
    email: professor.email,
    uid: professor.uid,
    turmas: professor.turmas ?? [],
    ativo: professor.ativo,
  });

  async function alocar() {
    setErro(null);

    const turma = turmas.find((t) => t.valor === turmaId);
    const disciplina = disciplinas.find((d) => d.valor === disciplinaId);

    if (!turma || !disciplina) {
      setErro("Escolha a turma e a disciplina.");
      return;
    }

    setOcupado("alocar");

    try {
      const resultado = await alocarProfessor(professor.id, {
        turmaId: turma.valor,
        turmaCodigo: turma.rotulo,
        disciplinaId: disciplina.valor,
        disciplinaNome: disciplina.rotulo,
        anoLetivo: turma.anoLetivo ?? new Date().getFullYear(),
      });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível alocar.");
        return;
      }

      setTurmaId("");
      setDisciplinaId("");
      router.refresh();
    } finally {
      setOcupado(null);
    }
  }

  async function remover(alocacaoId: string) {
    setErro(null);
    setOcupado(alocacaoId);

    try {
      const resultado = await removerAlocacao(professor.id, alocacaoId);
      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível remover.");
        return;
      }
      router.refresh();
    } finally {
      setOcupado(null);
    }
  }

  async function criarAcesso() {
    setErro(null);
    setAviso(null);
    setOcupado("acesso");

    try {
      const resultado = await criarAcessoDoProfessor(professor.id);

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível criar o acesso.");
        return;
      }

      try {
        await enviarEmailDeSenha(professor.email!);
        setAviso(
          `Acesso criado. Enviamos para ${professor.email} o link para criar a senha.`,
        );
      } catch {
        setAviso(
          `Acesso criado, mas o e-mail não saiu. Peça ao professor para usar "Esqueci minha senha" no login.`,
        );
      }

      router.refresh();
    } finally {
      setOcupado(null);
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
        <p className="border-success bg-success-surface text-success rounded-md border px-3 py-2 text-sm">
          {aviso}
        </p>
      )}

      {ativas.length === 0 ? (
        <EmptyState
          title="Nenhuma turma alocada"
          description="Sem alocação, o professor entra no Portal e não enxerga aluno nenhum."
        />
      ) : (
        <Table caption={`Alocações de ${professor.nome}`}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Turma</TableHeaderCell>
              <TableHeaderCell>Disciplina</TableHeaderCell>
              <TableHeaderCell>Ano</TableHeaderCell>
              <TableHeaderCell>
                <span className="sr-only">Ações</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ativas.map((alocacao) => (
              <TableRow key={alocacao.id}>
                <TableCell className="font-medium">
                  {alocacao.turmaCodigo}
                </TableCell>
                <TableCell>{alocacao.disciplinaNome}</TableCell>
                <TableCell className="tabular-nums">
                  {alocacao.anoLetivo}
                </TableCell>
                <TableCell className="text-right">
                  <button
                    type="button"
                    onClick={() => remover(alocacao.id)}
                    disabled={ocupado === alocacao.id}
                    className="text-ink-muted hover:text-danger inline-flex items-center gap-1 text-sm disabled:opacity-50"
                  >
                    <Link2Off className="size-3.5" aria-hidden />
                    {ocupado === alocacao.id ? "Removendo…" : "Remover"}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="border-line grid gap-3 border-t pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <SelectField
          label="Turma"
          value={turmaId}
          onChange={(evento) => setTurmaId(evento.target.value)}
        >
          <option value="">Selecione…</option>
          {turmas.map((turma) => (
            <option key={turma.valor} value={turma.valor}>
              {turma.rotulo}
              {turma.anoLetivo ? ` — ${turma.anoLetivo}` : ""}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Disciplina"
          value={disciplinaId}
          onChange={(evento) => setDisciplinaId(evento.target.value)}
        >
          <option value="">Selecione…</option>
          {disciplinas.map((disciplina) => (
            <option key={disciplina.valor} value={disciplina.valor}>
              {disciplina.rotulo}
            </option>
          ))}
        </SelectField>

        <Button
          onClick={alocar}
          disabled={!turmaId || !disciplinaId}
          loading={ocupado === "alocar"}
        >
          <Plus className="size-4" aria-hidden />
          Alocar
        </Button>
      </div>

      <div className="border-line flex items-center justify-between gap-4 border-t pt-4">
        <div>
          <p className="text-ink text-sm font-medium">Acesso ao Portal</p>
          <p className="text-ink-muted mt-0.5 text-sm">
            {professor.uid
              ? `Conta ativa para ${professor.email}. Ele enxerga ${professor.turmas?.length ?? 0} ${(professor.turmas?.length ?? 0) === 1 ? "turma" : "turmas"}.`
              : (impedimento ??
                `Será criada para ${professor.email}, que recebe o link para definir a senha.`)}
          </p>
        </div>

        {!professor.uid && (
          <Button
            onClick={criarAcesso}
            disabled={Boolean(impedimento)}
            loading={ocupado === "acesso"}
          >
            <KeyRound className="size-4" aria-hidden />
            Criar acesso
          </Button>
        )}
      </div>
    </div>
  );
}
