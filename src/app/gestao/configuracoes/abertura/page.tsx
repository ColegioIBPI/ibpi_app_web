import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { anoLetivoEscolhido } from "@/core/escola/ano-letivo.server";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type Matricula, type Turma } from "@/core/modelo";
import { Card } from "@/core/ui/card";
import { alunosParaPassar } from "@/features/ano-letivo/domain/abertura";
import {
  AberturaDoAno,
  type AlunoDaTurma,
} from "@/features/ano-letivo/components/abertura";

export const metadata: Metadata = { title: "Abrir o ano letivo" };

/**
 * Abrir o ano seguinte ao que está selecionado.
 *
 * O ano base é o **escolhido no menu**, e o novo é o seguinte. Não há
 * campo para digitar os dois: abrir 2028 a partir de 2024 não é um caso
 * real, e oferecer a combinação convida ao engano.
 */
export default async function AberturaPage() {
  await exigirPermissao("cadastros", "gerenciar");

  const anoBase = await anoLetivoEscolhido();
  const anoNovo = anoBase + 1;

  const db = getAdminDb();

  const [turmasDocs, doAnoBase, jaNoAnoNovo] = await Promise.all([
    db.collection(COLECOES.turmas).get(),
    db.collection(COLECOES.matriculas).where("anoLetivo", "==", anoBase).get(),
    db.collection(COLECOES.matriculas).where("anoLetivo", "==", anoNovo).get(),
  ]);

  const turmas = turmasDocs.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Turma),
  }));

  const matriculasBase = doAnoBase.docs.map((doc) => doc.data() as Matricula);
  const matriculasNovas = jaNoAnoNovo.docs.map((doc) => doc.data() as Matricula);

  const doAno = (ano: number) =>
    turmas
      .filter((turma) => turma.anoLetivo === ano && turma.ativa !== false)
      .sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR"));

  // Quem ainda não passou, turma a turma. A conta é a mesma que a ação
  // refaz no servidor — aqui ela só monta a tela.
  const alunosPorTurma: Record<string, AlunoDaTurma[]> = {};

  for (const turma of doAno(anoBase)) {
    alunosPorTurma[turma.id] = alunosParaPassar(
      matriculasBase,
      matriculasNovas,
      turma.id,
    ).map((registro) => ({
      matricula: registro.matricula,
      nome: registro.nome,
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/gestao/configuracoes"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Configurações
        </Link>

        <h1 className="text-ink mt-2 text-xl font-semibold">
          Abrir o ano letivo de {anoNovo}
        </h1>
        <p className="text-ink-muted mt-1 max-w-prose text-sm">
          A partir de {anoBase}, que é o ano selecionado no menu.{" "}
          <strong className="text-ink">Nada de {anoBase} é apagado</strong>:
          o ano novo é um conjunto novo de turmas, vínculos e matrículas, e
          o anterior fica inteiro onde está.
        </p>
      </div>

      {doAno(anoBase).length === 0 ? (
        <Card>
          <p className="text-ink text-sm">
            {anoBase} não tem turma nenhuma — não há o que copiar. Troque o
            ano no menu lateral para o ano que serve de base.
          </p>
        </Card>
      ) : (
        <AberturaDoAno
          anoBase={anoBase}
          anoNovo={anoNovo}
          turmasDoAnoBase={doAno(anoBase).map((turma) => ({
            id: turma.id,
            codigo: turma.codigo,
            alunos: alunosPorTurma[turma.id]?.length ?? 0,
          }))}
          turmasDoAnoNovo={doAno(anoNovo).map((turma) => ({
            id: turma.id,
            codigo: turma.codigo,
            alunos: 0,
          }))}
          alunosPorTurma={alunosPorTurma}
        />
      )}
    </div>
  );
}
