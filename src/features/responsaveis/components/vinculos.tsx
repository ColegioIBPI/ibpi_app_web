"use client";

import { KeyRound, Link2Off, UserPlus } from "lucide-react";
import Link from "next/link";
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
  alterarVinculo,
  criarAcessoDoResponsavel,
  reenviarAcessoDoResponsavel,
} from "@/features/responsaveis/actions/responsaveis";
import { motivoParaNaoCriarConta } from "@/features/responsaveis/domain/busca";
import type {
  AlunoResumido,
  ResponsavelComId,
} from "@/features/responsaveis/services/responsaveis.server";

interface VinculosProps {
  responsavel: ResponsavelComId;
  filhos: AlunoResumido[];
  disponiveis: AlunoResumido[];
}

/**
 * Vínculo com alunos e criação do acesso.
 *
 * Os dois ficam na mesma tela porque dependem um do outro: o acesso só faz
 * sentido depois do vínculo, já que é ele que define o que a família enxerga.
 */
export function Vinculos({ responsavel, filhos, disponiveis }: VinculosProps) {
  const router = useRouter();
  const [selecionado, setSelecionado] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // Mostrado quando o e-mail não sai: sem ele a secretaria não tem como
  // ajudar, e a conta fica criada e inacessível.
  const [link, setLink] = useState<string | null>(null);

  const impedimento = motivoParaNaoCriarConta({
    ...responsavel,
    alunosVinculados: responsavel.alunosVinculados ?? [],
  });

  async function vincular() {
    if (!selecionado) return;

    setErro(null);
    setOcupado("vinculo");

    const resultado = await alterarVinculo(
      responsavel.id,
      selecionado,
      "vincular",
    );

    setOcupado(null);
    if (!resultado.ok)
      return setErro(resultado.erro ?? "Não foi possível vincular.");

    setSelecionado("");
    router.refresh();
  }

  async function desvincular(matricula: string) {
    setErro(null);
    setOcupado(matricula);

    const resultado = await alterarVinculo(
      responsavel.id,
      matricula,
      "desvincular",
    );

    setOcupado(null);
    if (!resultado.ok)
      return setErro(resultado.erro ?? "Não foi possível desvincular.");

    router.refresh();
  }

  async function criarAcesso() {
    setErro(null);
    setAviso(null);
    setOcupado("acesso");

    const resultado = await criarAcessoDoResponsavel(responsavel.id);

    if (!resultado.ok) {
      setOcupado(null);
      return setErro(resultado.erro ?? "Não foi possível criar o acesso.");
    }

    // O Admin SDK gera o link, mas não envia e-mail — quem envia é o SDK
    // cliente, usando o serviço do próprio Firebase. Sem isso, a secretaria
    // teria que copiar e colar o link para a família.
    try {
      await enviarEmailDeSenha(responsavel.email!);
      setAviso(
        `Acesso criado. Enviamos para ${responsavel.email} o link para criar a senha.`,
      );
    } catch {
      setAviso(`Acesso criado, mas o e-mail não saiu.`);
      setLink(resultado.link ?? null);
    }

    setOcupado(null);
    router.refresh();
  }

  async function reenviar() {
    setErro(null);
    setAviso(null);
    setLink(null);
    setOcupado("reenvio");

    const resultado = await reenviarAcessoDoResponsavel(responsavel.id);

    if (!resultado.ok) {
      setOcupado(null);
      return setErro(resultado.erro ?? "Não foi possível gerar o link.");
    }

    try {
      await enviarEmailDeSenha(resultado.email!);
      setAviso(`Link reenviado para ${resultado.email}.`);
    } catch {
      setAviso("O e-mail não saiu.");
      setLink(resultado.link ?? null);
    }

    setOcupado(null);
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

      {filhos.length === 0 ? (
        <EmptyState
          title="Nenhum aluno vinculado"
          description="Sem vínculo, o responsável não enxerga nada no Portal."
        />
      ) : (
        <Table caption={`Alunos de ${responsavel.nome}`}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Aluno</TableHeaderCell>
              <TableHeaderCell>Matrícula</TableHeaderCell>
              <TableHeaderCell>Turma</TableHeaderCell>
              <TableHeaderCell>
                <span className="sr-only">Ações</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filhos.map((filho) => (
              <TableRow key={filho.matricula}>
                <TableCell>
                  <Link
                    href={`/gestao/alunos/${filho.matricula}`}
                    className="text-brand-600 font-medium hover:underline"
                  >
                    {filho.nome}
                  </Link>
                </TableCell>
                <TableCell className="tabular-nums">
                  {filho.matricula}
                </TableCell>
                <TableCell>{filho.turmaCodigo ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <button
                    type="button"
                    onClick={() => desvincular(filho.matricula)}
                    disabled={ocupado === filho.matricula}
                    className="text-ink-muted hover:text-danger inline-flex items-center gap-1 text-sm disabled:opacity-50"
                  >
                    <Link2Off className="size-3.5" aria-hidden />
                    {ocupado === filho.matricula ? "Removendo…" : "Desvincular"}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="border-line flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <SelectField
            label="Vincular aluno"
            value={selecionado}
            onChange={(evento) => setSelecionado(evento.target.value)}
          >
            <option value="">Selecione um aluno…</option>
            {disponiveis.map((aluno) => (
              <option key={aluno.matricula} value={aluno.matricula}>
                {aluno.nome}
                {aluno.turmaCodigo ? ` — ${aluno.turmaCodigo}` : ""}
              </option>
            ))}
          </SelectField>
        </div>

        <Button
          onClick={vincular}
          disabled={!selecionado}
          loading={ocupado === "vinculo"}
        >
          <UserPlus className="size-4" aria-hidden />
          Vincular
        </Button>
      </div>

      <div className="border-line flex flex-col gap-2 border-t pt-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-ink text-sm font-medium">Acesso ao Portal</p>
            <p className="text-ink-muted mt-0.5 text-sm">
              {responsavel.uid
                ? `Conta ativa para ${responsavel.email}.`
                : (impedimento ??
                  `Será criada para ${responsavel.email}, que recebe o link para definir a senha.`)}
            </p>
          </div>

          {responsavel.uid ? (
            <Button
              variant="secondary"
              onClick={reenviar}
              loading={ocupado === "reenvio"}
            >
              <KeyRound className="size-4" aria-hidden />
              Reenviar link de senha
            </Button>
          ) : (
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

        {link && (
          <div className="border-line bg-surface-subtle rounded-md border p-3">
            <p className="text-ink text-sm font-medium">
              Mande este link para {responsavel.email}
            </p>
            <p className="text-ink-muted mt-0.5 text-xs">
              Ele cria a senha e vale por algumas horas. Não reaproveite: para
              outra pessoa, gere um novo.
            </p>
            <code className="text-ink mt-2 block text-xs break-all">
              {link}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
