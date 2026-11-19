import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { anoLetivoEscolhido } from "@/core/escola/ano-letivo.server";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type Matricula, type Turma } from "@/core/modelo";
import { Card } from "@/core/ui/card";
import {
  anoBaseDaAbertura,
  alunosParaPassar,
} from "@/features/ano-letivo/domain/abertura";
import {
  AberturaDoAno,
  type AlunoDaTurma,
} from "@/features/ano-letivo/components/abertura";

export const metadata: Metadata = { title: "Abrir o ano letivo" };

/**
 * Abrir um ano letivo a partir do anterior.
 *
 * O ano a abrir é sempre **o seguinte ao ano base**, e o base começa no
 * ano que falta abrir — ver `anoBaseDaAbertura`. Não é o ano do seletor:
 * quem troca o seletor para 2027 e encontra a lista vazia vem para cá
 * querendo encher 2027, e receber uma tela sobre 2028 é um beco sem
 * saída.
 *
 * O base é trocável na própria tela, porque passar uma turma esquecida
 * depois que o ano já encheu é caso real. Abrir 2028 a partir de 2024
 * não é, e por isso o base sai de uma lista de anos que existem, e não
 * de um campo livre.
 */
export default async function AberturaPage({
  searchParams,
}: PageProps<"/gestao/configuracoes/abertura">) {
  await exigirPermissao("cadastros", "gerenciar");

  const filtros = await searchParams;
  const anoSelecionado = await anoLetivoEscolhido();

  const db = getAdminDb();

  const [turmasDocs, matriculasDocs] = await Promise.all([
    db.collection(COLECOES.turmas).get(),
    db.collection(COLECOES.matriculas).get(),
  ]);

  const turmas = turmasDocs.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Turma),
  }));

  const matriculas = matriculasDocs.docs.map((doc) => doc.data() as Matricula);

  // Só serve de base um ano que tenha turma: não há o que copiar de um
  // ano vazio, e oferecê-lo seria oferecer um clique que não faz nada.
  const anosComTurma = [
    ...new Set(turmas.map((turma) => turma.anoLetivo)),
  ].sort((a, b) => b - a);

  // Quantas matrículas cada ano com turma tem — é o que distingue o ano
  // cheio, de onde se copia, do ano pela metade, que é o que falta abrir.
  const anosCandidatos = anosComTurma.map((ano) => ({
    ano,
    matriculas: matriculas.filter((registro) => registro.anoLetivo === ano)
      .length,
  }));

  const escolhido = Number(
    typeof filtros.de === "string" ? filtros.de : Number.NaN,
  );

  const anoBase = anosComTurma.includes(escolhido)
    ? escolhido
    : anoBaseDaAbertura(anoSelecionado, anosCandidatos);

  const anoNovo = anoBase + 1;

  const matriculasBase = matriculas.filter(
    (registro) => registro.anoLetivo === anoBase,
  );
  const matriculasNovas = matriculas.filter(
    (registro) => registro.anoLetivo === anoNovo,
  );

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
          A partir de {anoBase}.{" "}
          <strong className="text-ink">Nada de {anoBase} é apagado</strong>: o
          ano novo é um conjunto novo de turmas, vínculos e matrículas, e o
          anterior fica inteiro onde está.
        </p>
      </div>

      {/*
        O par de anos é a primeira coisa da tela, e não um detalhe no
        rodapé: é ele que decide para onde trinta alunos vão. Fica num
        formulário `GET` simples — a escolha mora na URL, que é o que
        permite mandar o link certo a um colega.
      */}
      <Card
        title="De que ano para que ano"
        description="O ano novo é sempre o seguinte ao ano de origem."
      >
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-ink text-sm font-medium">Passar de</span>
            <select
              name="de"
              defaultValue={String(anoBase)}
              className="border-line bg-surface text-ink h-10 rounded-md border px-3 text-sm tabular-nums"
            >
              {anosComTurma.map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </label>

          <ArrowRight className="text-ink-muted mb-3 size-4" aria-hidden />

          <div className="mb-1 flex flex-col gap-1">
            <span className="text-ink-muted text-sm">Para</span>
            <span className="text-ink text-lg font-semibold tabular-nums">
              {anoNovo}
            </span>
          </div>

          <button
            type="submit"
            className="border-line bg-surface text-ink hover:bg-surface-subtle h-10 rounded-md border px-4 text-sm font-medium"
          >
            Trocar
          </button>
        </form>

        {anoBase !== anoSelecionado && (
          <p className="text-ink-muted mt-3 text-sm">
            O seletor do menu está em {anoSelecionado}, e esta tela está
            abrindo {anoNovo} a partir de {anoBase} — que é o que falta
            fazer. Trocar aqui não mexe no seletor.
          </p>
        )}
      </Card>

      {doAno(anoBase).length === 0 ? (
        <Card>
          <p className="text-ink text-sm">
            {anoBase} não tem turma nenhuma — não há o que copiar. Escolha
            outro ano de origem acima.
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
