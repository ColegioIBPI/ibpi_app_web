import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { anoLetivoAtual } from "@/core/lib/ano-letivo";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type Turma } from "@/core/modelo";
import { rotuloDoCurso } from "@/features/cursos/domain/curso";
import { listarCursos } from "@/features/cursos/services/cursos.server";
import {
  VinculosPorTurma,
  type TurmaComVinculos,
} from "@/features/cursos/components/vinculos-por-turma";
import {
  alocacoesDaTurma,
  listarProfessores,
  opcoesDeAlocacao,
} from "@/features/professores/services/professores.server";

export const metadata: Metadata = { title: "Vínculos" };

export default async function VinculosPage({
  searchParams,
}: PageProps<"/gestao/configuracoes/vinculos">) {
  await exigirPermissao("cadastros", "gerenciar");

  const { ano } = await searchParams;
  const anoLetivo = typeof ano === "string" ? Number(ano) : anoLetivoAtual();

  const [turmasDocs, cursos, professores, opcoes] = await Promise.all([
    getAdminDb()
      .collection(COLECOES.turmas)
      .where("anoLetivo", "==", anoLetivo)
      .get(),
    listarCursos(),
    listarProfessores(),
    opcoesDeAlocacao(),
  ]);

  const turmas: TurmaComVinculos[] = await Promise.all(
    turmasDocs.docs
      .map((doc) => ({ id: doc.id, turma: doc.data() as Turma }))
      .filter(({ turma }) => turma.ativa !== false)
      .sort((a, b) => a.turma.codigo.localeCompare(b.turma.codigo, "pt-BR"))
      .map(async ({ id, turma }) => ({
        id,
        codigo: turma.codigo,
        anoLetivo: turma.anoLetivo,
        cursoRotulo: rotuloDoCurso(turma.segmento, cursos),
        vinculos: (await alocacoesDaTurma(id)).map((alocacao) => ({
          id: alocacao.id,
          disciplinaId: alocacao.disciplinaId,
          disciplinaNome: alocacao.disciplinaNome ?? alocacao.disciplinaId,
          professorId: alocacao.professorId,
          professorNome: alocacao.professorNome ?? "Professor",
        })),
      })),
  );

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
          Vínculos de {anoLetivo}
        </h1>
        <p className="text-ink-muted mt-1 text-sm">
          Qual professor leciona qual disciplina em cada turma. É este vínculo
          que define quais alunos o professor enxerga no Portal.
        </p>
      </div>

      <VinculosPorTurma
        turmas={turmas}
        professores={professores
          .filter((professor) => professor.ativo !== false)
          .map((professor) => ({
            valor: professor.id,
            rotulo: professor.nome,
          }))}
        disciplinas={opcoes.disciplinas}
      />
    </div>
  );
}
