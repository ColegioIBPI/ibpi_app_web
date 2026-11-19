import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { anoLetivoEscolhido } from "@/core/escola/ano-letivo.server";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type Turma } from "@/core/modelo";
import { Card } from "@/core/ui/card";
import { NovoAluno } from "@/features/alunos/components/novo-aluno";

export const metadata: Metadata = { title: "Novo aluno" };

export default async function NovoAlunoPage() {
  await exigirPermissao("cadastros", "gerenciar");

  const anoLetivo = await anoLetivoEscolhido();

  // Só as turmas do ano em que a pessoa está: oferecer as de outro ano
  // criaria um aluno de 2027 numa turma de 2026 sem ninguém perceber.
  const turmas = (await getAdminDb().collection(COLECOES.turmas).get()).docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Turma) }))
    .filter((turma) => turma.anoLetivo === anoLetivo && turma.ativa !== false)
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR"))
    .map((turma) => ({ id: turma.id, codigo: turma.codigo }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/gestao/alunos"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Alunos
        </Link>

        <h1 className="text-ink mt-2 text-xl font-semibold">Novo aluno</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Ano letivo de {anoLetivo}. O cadastro completo vem depois — aqui é
          só o necessário para o aluno existir e ganhar matrícula.
        </p>
      </div>

      <Card>
        <NovoAluno anoLetivo={anoLetivo} turmas={turmas} />
      </Card>
    </div>
  );
}
