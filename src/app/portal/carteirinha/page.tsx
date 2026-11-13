import type { Metadata } from "next";

import { exigirArea } from "@/core/auth/guards";
import { anoLetivoAtual } from "@/core/lib/ano-letivo";
import { paraDataISO } from "@/core/lib/datas";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/states";
import { obterAlunoVisivel } from "@/features/alunos/services/alunos.server";
import { Cartao } from "@/features/carteirinha/components/cartao";
import { validadeDaCarteirinha } from "@/features/carteirinha/domain/carteirinha";
import { rotuloDoCurso } from "@/features/cursos/domain/curso";
import { listarCursos } from "@/features/cursos/services/cursos.server";

export const metadata: Metadata = { title: "Carteirinha" };

/**
 * A carteirinha estudantil.
 *
 * O aluno vê a dele; o responsável, a de cada filho — é ele quem está com
 * o celular na mão na portaria e na excursão.
 *
 * Os alunos vêm por `obterAlunoVisivel`, que repete o escopo do cadastro:
 * o Admin SDK ignora as Security Rules, então pedir pela matrícula da
 * sessão não basta — é a função que garante que a matrícula pedida é mesmo
 * daquela conta.
 */
export default async function CarteirinhaPage() {
  const sessao = await exigirArea("consulta");

  const matriculas =
    sessao.role === "aluno"
      ? sessao.matricula
        ? [sessao.matricula]
        : []
      : sessao.alunosVinculados;

  const anoLetivo = anoLetivoAtual();
  const hoje = paraDataISO(new Date());

  const [cursos, encontrados] = await Promise.all([
    listarCursos(),
    Promise.all(
      matriculas.map((matricula) => obterAlunoVisivel(sessao, matricula)),
    ),
  ]);

  const alunos = encontrados.filter((aluno) => aluno !== null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Carteirinha</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Vale o ano letivo de {anoLetivo}. Dá para imprimir com Ctrl+P.
        </p>
      </div>

      {alunos.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum aluno vinculado"
            description="Fale com a secretaria para vincular o seu acesso."
          />
        </Card>
      ) : (
        <div className="flex flex-wrap gap-6">
          {alunos.map((aluno) => (
            <Cartao
              key={aluno.matricula}
              anoLetivo={anoLetivo}
              validade={validadeDaCarteirinha(aluno, anoLetivo, hoje)}
              aluno={{
                matricula: aluno.matricula,
                nome: aluno.nome,
                turmaCodigo: aluno.turmaCodigo,
                serie: aluno.serie,
                turno: aluno.turno,
                curso: rotuloDoCurso(aluno.segmento, cursos),
                dataNascimento: aluno.dataNascimento,
                fotoPath: aluno.fotoPath,
                fotoAtualizadaEm: aluno.fotoAtualizadaEm,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
