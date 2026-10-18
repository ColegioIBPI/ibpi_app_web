import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { exigirPermissao } from "@/core/auth/guards";
import { anoLetivoAtual } from "@/core/lib/ano-letivo";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/states";
import { FiltrosDeAlunos } from "@/features/alunos/components/filtros-de-alunos";
import {
  filtrarAlunos,
  ordenarPorNome,
  turmasDaLista,
} from "@/features/alunos/domain/busca";
import { listarAlunosVisiveis } from "@/features/alunos/services/alunos.server";
import { pode } from "@/core/auth/roles";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type Boletim } from "@/core/modelo";
import { LiberacaoDeBoletins } from "@/features/notas/components/liberacao-de-boletins";
import { idDoBoletim } from "@/features/notas/services/notas.server";

export const metadata: Metadata = { title: "Boletins" };

export default async function BoletinsPage({
  searchParams,
}: PageProps<"/gestao/boletins">) {
  const sessao = await exigirPermissao("notas", "ler");
  const filtros = await searchParams;
  const ano = anoLetivoAtual();

  const todos = await listarAlunosVisiveis(sessao);
  const encontrados = ordenarPorNome(
    filtrarAlunos(todos, {
      termo: typeof filtros.q === "string" ? filtros.q : undefined,
      turma: typeof filtros.turma === "string" ? filtros.turma : undefined,
      situacao: filtros.situacao === "todos" ? "todos" : "ativos",
    }),
  );

  /**
   * As liberações dos alunos encontrados, em uma leitura só.
   *
   * `getAll` com os ids, e não uma consulta por aluno: a lista tem a turma
   * inteira, e trinta idas ao banco deixariam a tela lenta justamente no
   * dia em que a secretaria abre para liberar todo mundo.
   */
  const podeLiberar = pode(sessao.role, "notas", "gerenciar");

  const db = getAdminDb();
  const boletins =
    podeLiberar && encontrados.length > 0
      ? await db.getAll(
          ...encontrados.map((aluno) =>
            db
              .collection(COLECOES.boletins)
              .doc(idDoBoletim(ano, aluno.matricula)),
          ),
        )
      : [];

  const liberacoesPorMatricula = new Map(
    boletins
      .filter((doc) => doc.exists)
      .map((doc) => {
        const boletim = doc.data() as Boletim;
        return [boletim.matricula, boletim.liberacoes ?? {}] as const;
      }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Boletins</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Ano letivo de {ano} · {encontrados.length}{" "}
          {encontrados.length === 1 ? "aluno" : "alunos"}
        </p>
      </div>

      <Card>
        <Suspense>
          <FiltrosDeAlunos turmas={turmasDaLista(todos)} />
        </Suspense>
      </Card>

      {podeLiberar && encontrados.length > 0 && (
        <Card
          title="Liberação para a família"
          description="A família só vê o trimestre depois que a caixa é marcada. Antes disso, nem o Portal nem o aplicativo entregam as notas."
        >
          <LiberacaoDeBoletins
            anoLetivo={ano}
            alunos={encontrados.map((aluno) => ({
              matricula: aluno.matricula,
              nome: aluno.nome,
              turmaCodigo: aluno.turmaCodigo ?? null,
              liberacoes: liberacoesPorMatricula.get(aluno.matricula) ?? {},
            }))}
          />
        </Card>
      )}

      <Card>
        {encontrados.length === 0 ? (
          <EmptyState
            title="Nenhum aluno encontrado"
            description="Ajuste a busca para encontrar o aluno."
          />
        ) : (
          <ul className="divide-line divide-y">
            {encontrados.map((aluno) => (
              <li key={aluno.matricula}>
                <Link
                  href={`/gestao/boletins/${aluno.matricula}`}
                  className="hover:bg-surface-subtle -mx-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded px-2 py-3"
                >
                  <span className="text-brand-600 font-medium">
                    {aluno.nome}
                  </span>
                  <span className="text-ink-muted text-sm">
                    {aluno.matricula}
                    {aluno.turmaCodigo ? ` · ${aluno.turmaCodigo}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
