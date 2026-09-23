import type { Metadata } from "next";

import { exigirPermissao } from "@/core/auth/guards";
import { paraDataISO } from "@/core/lib/datas";
import { formatDate } from "@/core/lib/format";
import { COLECOES, type Aluno } from "@/core/modelo";
import { getAdminDb } from "@/core/firebase/admin";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/states";
import { Chamada } from "@/features/frequencia/components/chamada";
import { SeletorDaChamada } from "@/features/frequencia/components/seletor-da-chamada";
import { montarChamada } from "@/features/frequencia/domain/chamada";
import { lancamentosDoDia } from "@/features/frequencia/services/frequencia.server";

export const metadata: Metadata = { title: "Frequência" };

export default async function FrequenciaPage({
  searchParams,
}: PageProps<"/gestao/frequencia">) {
  const sessao = await exigirPermissao("frequencia", "lancar");
  const filtros = await searchParams;

  const db = getAdminDb();

  // O professor só faz chamada das turmas que leciona.
  const minhasTurmas =
    sessao.role === "professor"
      ? (((await db.collection(COLECOES.users).doc(sessao.uid).get()).data()
          ?.turmas as string[]) ?? [])
      : null;

  const turmasDocs = await db.collection(COLECOES.turmas).get();
  const turmas = turmasDocs.docs
    .filter((doc) => !minhasTurmas || minhasTurmas.includes(doc.id))
    .map((doc) => ({ id: doc.id, codigo: doc.data().codigo as string }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR"));

  const turmaId =
    typeof filtros.turma === "string" &&
    turmas.some((t) => t.id === filtros.turma)
      ? filtros.turma
      : (turmas[0]?.id ?? null);

  const data =
    typeof filtros.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(filtros.data)
      ? filtros.data
      : paraDataISO(new Date());

  const turma = turmas.find((t) => t.id === turmaId);

  const alunos = turmaId
    ? (
        await db
          .collection(COLECOES.alunos)
          .where("turmaId", "==", turmaId)
          .where("ativo", "==", true)
          .get()
      ).docs
        .map((doc) => doc.data() as Aluno)
        .map((aluno) => ({ matricula: aluno.matricula, nome: aluno.nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    : [];

  const lancamentos = turmaId ? await lancamentosDoDia(turmaId, data) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Frequência</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Chamada de {formatDate(data)}
          {turma ? ` · turma ${turma.codigo}` : ""}
        </p>
      </div>

      <Card>
        <SeletorDaChamada turmas={turmas} turmaId={turmaId} data={data} />
      </Card>

      <Card>
        {!turma ? (
          <EmptyState
            title="Nenhuma turma disponível"
            description="Cadastre uma turma antes de fazer a chamada."
          />
        ) : alunos.length === 0 ? (
          <EmptyState
            title="Nenhum aluno nesta turma"
            description="Matricule alunos para poder fazer a chamada."
          />
        ) : (
          <Chamada
            turmaId={turma.id}
            turmaCodigo={turma.codigo}
            data={data}
            linhas={montarChamada(alunos, lancamentos)}
          />
        )}
      </Card>
    </div>
  );
}
