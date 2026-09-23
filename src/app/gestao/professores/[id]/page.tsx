import { ArrowLeft, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { Card } from "@/core/ui/card";
import { Alocacoes } from "@/features/professores/components/alocacoes";
import {
  alocacoesDoProfessor,
  obterProfessor,
  opcoesDeAlocacao,
} from "@/features/professores/services/professores.server";

export async function generateMetadata({
  params,
}: PageProps<"/gestao/professores/[id]">): Promise<Metadata> {
  const { id } = await params;
  const professor = await obterProfessor(id);
  return { title: professor?.nome ?? "Professor" };
}

export default async function ProfessorPage({
  params,
}: PageProps<"/gestao/professores/[id]">) {
  await exigirPermissao("cadastros", "gerenciar");
  const { id } = await params;

  const professor = await obterProfessor(id);
  if (!professor) notFound();

  const [alocacoes, opcoes] = await Promise.all([
    alocacoesDoProfessor(id),
    opcoesDeAlocacao(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/gestao/professores"
            className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Professores
          </Link>

          <h1 className="text-ink mt-2 text-xl font-semibold">
            {professor.nome}
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            {professor.email ?? "sem e-mail"}
            {professor.horario ? ` · ${professor.horario}` : ""}
            {professor.ativo ? "" : " · inativo"}
          </p>
        </div>

        <Link
          href={`/gestao/professores/${professor.id}/editar`}
          className="border-line text-ink hover:bg-surface-subtle inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium"
        >
          <Pencil className="size-4" aria-hidden />
          Editar
        </Link>
      </div>

      <Card title="Dados">
        <dl className="divide-line divide-y text-sm">
          {[
            { rotulo: "CPF", valor: formatarCpf(professor.cpf) },
            { rotulo: "Identidade", valor: professor.identidade ?? "—" },
            {
              rotulo: "Telefone",
              valor: formatarTelefone(professor.telefones?.[0]),
            },
            { rotulo: "Código interno", valor: professor.codigoInterno ?? "—" },
            { rotulo: "Observações", valor: professor.observacoes ?? "—" },
          ].map((campo) => (
            <div
              key={campo.rotulo}
              className="grid grid-cols-[10rem_1fr] gap-3 py-2"
            >
              <dt className="text-ink-muted">{campo.rotulo}</dt>
              <dd className="text-ink break-words">{campo.valor}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card
        title="Turmas e acesso"
        description="A alocação define o que o professor enxerga no sistema."
      >
        <Alocacoes
          professor={professor}
          alocacoes={alocacoes}
          turmas={opcoes.turmas}
          disciplinas={opcoes.disciplinas}
        />
      </Card>
    </div>
  );
}

function formatarCpf(valor: string | null | undefined): string {
  if (!valor || valor.length !== 11) return valor ?? "—";
  return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6, 9)}-${valor.slice(9)}`;
}

function formatarTelefone(valor: string | null | undefined): string {
  if (!valor) return "—";

  const digitos = valor.replace(/\D/g, "").replace(/^55/, "");
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return valor;
}
