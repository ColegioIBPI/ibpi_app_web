import "server-only";

import { pode } from "@/core/auth/roles";
import type { SessionUser } from "@/core/auth/session";
import { contar, percentualDePresenca } from "@/core/escola/frequencia";
import { getAdminDb } from "@/core/firebase/admin";
import { formatCurrency } from "@/core/lib/format";
import { anoLetivoAtual, trimestreSugerido } from "@/core/lib/ano-letivo";
import {
  COLECOES,
  type Alocacao,
  type Boletim,
  type Cobranca,
  type FrequenciaDiaria,
  type SituacaoDePresenca,
  type Solicitacao,
  type Turma,
} from "@/core/modelo";
import { listarAlunosVisiveis } from "@/features/alunos/services/alunos.server";
import { situacaoDaCobranca } from "@/features/financeiro/domain/cobranca";
import { trimestresLiberados } from "@/features/notas/domain/liberacao";
import { estaEncerrada } from "@/features/solicitacoes/domain/fila";
import {
  abaixoDaFrequencia,
  comPendencia,
  ehDiaLetivo,
  plural,
  semTrimestreLiberado,
  turmasSemChamada,
  turmasSemGrade,
  type Pendencia,
} from "@/features/painel/domain/pendencias";

/**
 * O painel da tela inicial.
 *
 * Carrega o colégio inteiro de uma vez e cruza em memória, como os
 * relatórios financeiros: são algumas centenas de documentos, e a
 * alternativa — uma consulta por indicador — multiplicaria as idas ao banco
 * na tela que todo mundo abre primeiro.
 *
 * Cada indicador é **guardado pela permissão do recurso a que pertence**.
 * O painel não pode ser a porta dos fundos: o professor não vê o vencido
 * do colégio só porque é um número pequeno numa caixa.
 */

export interface Painel {
  pendencias: Pendencia[];
  anoLetivo: number;
  trimestre: number;
  /** Contexto, sem ação: quantos alunos, turmas e professores. */
  numeros: Array<{ rotulo: string; valor: string }>;
}

export async function montarPainel(
  sessao: SessionUser,
  agora = new Date(),
): Promise<Painel> {
  const db = getAdminDb();
  const anoLetivo = anoLetivoAtual(agora);
  const trimestre = trimestreSugerido(agora);

  const alunos = (await listarAlunosVisiveis(sessao)).filter((a) => a.ativo);

  const [turmasDocs, alocacoesDocs] = await Promise.all([
    db.collection(COLECOES.turmas).get(),
    db.collection(COLECOES.alocacoes).get(),
  ]);

  const turmas = turmasDocs.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Turma) }))
    .filter((t) => t.ativa !== false && t.anoLetivo === anoLetivo);

  /**
   * O professor responde só pelas turmas em que está alocado.
   *
   * O escopo vem de `users/{uid}.turmas`, que é o mesmo campo que as
   * Security Rules leem — e **não** de `alocacoes.professorId`, que é o id
   * do cadastro do professor e nunca seria igual ao uid da conta. Um
   * filtro por ali não casaria nunca, e o painel mostraria a escola
   * inteira sem ninguém notar.
   */
  const minhasTurmas =
    sessao.role === "professor" ? await turmasDaConta(sessao.uid) : null;

  const turmasNoEscopo = minhasTurmas
    ? turmas.filter((t) => minhasTurmas.includes(t.id))
    : turmas;

  const pendencias: Pendencia[] = [];

  if (pode(sessao.role, "solicitacoes", "gerenciar")) {
    pendencias.push(await pedidosEsperando(agora));
  }

  if (pode(sessao.role, "frequencia", "lancar")) {
    const chamada = await chamadaDeHoje(turmasNoEscopo, agora);
    if (chamada) pendencias.push(chamada);
  }

  if (pode(sessao.role, "notas", "ler")) {
    pendencias.push(
      await riscoDeReprovacaoPorFalta(alunos.map((a) => a.matricula), alunos),
    );
  }

  if (pode(sessao.role, "notas", "gerenciar")) {
    pendencias.push(
      await boletinsNaoLiberados(alunos, anoLetivo, trimestre),
    );
  }

  if (pode(sessao.role, "financeiro", "ler")) {
    const financeiro = await situacaoFinanceira(
      alunos.map((a) => a.matricula),
      agora,
      pode(sessao.role, "financeiro", "lancar"),
    );
    pendencias.push(...financeiro);
  }

  if (pode(sessao.role, "cadastros", "gerenciar")) {
    const alocacoes = alocacoesDocs.docs
      .map((doc) => doc.data() as Alocacao)
      .filter((a) => a.anoLetivo === anoLetivo && a.ativa !== false);

    const porTurma = new Map<string, Set<string>>();
    for (const alocacao of alocacoes) {
      if (!porTurma.has(alocacao.turmaId)) porTurma.set(alocacao.turmaId, new Set());
      porTurma.get(alocacao.turmaId)!.add(alocacao.disciplinaId);
    }

    const semGrade = turmasSemGrade(
      turmas.map((t) => ({
        id: t.id,
        codigo: t.codigo,
        disciplinas: porTurma.get(t.id)?.size ?? 0,
      })),
    );

    pendencias.push({
      chave: "grade",
      titulo: "Turmas sem grade montada",
      valor: String(semGrade.length),
      detalhe:
        semGrade.length > 0
          ? `${semGrade.map((t) => t.codigo).join(", ")} — sem vínculo, o professor abre o diário vazio`
          : "",
      href: "/gestao/configuracoes/vinculos",
      gravidade: "alta",
    });
  }

  return {
    pendencias: comPendencia(pendencias),
    anoLetivo,
    trimestre,
    numeros: [
      { rotulo: "Alunos matriculados", valor: String(alunos.length) },
      // `turmasNoEscopo`, e não `turmas`: o professor via "10 turmas
      // ativas" ao lado dos 35 alunos dele. Número de contexto que
      // contradiz o escopo é pior que número nenhum.
      { rotulo: "Turmas ativas", valor: String(turmasNoEscopo.length) },
    ],
  };
}

/** As turmas que a conta do professor alcança, como a regra as lê. */
async function turmasDaConta(uid: string): Promise<string[]> {
  const doc = await getAdminDb().collection(COLECOES.users).doc(uid).get();

  return (doc.data()?.turmas as string[]) ?? [];
}

async function pedidosEsperando(agora: Date): Promise<Pendencia> {
  const docs = await getAdminDb().collection(COLECOES.solicitacoes).get();

  // `estaEncerrada` é do domínio da fila: a lista de situações finais
  // mora num lugar só, e inventá-la aqui seria a segunda versão dela.
  const abertos = docs.docs.filter(
    (doc) => !estaEncerrada((doc.data() as Solicitacao).situacao),
  );

  // O mais antigo primeiro: é a família que está esperando há mais tempo.
  const maisAntigo = abertos
    .map((doc) => (doc.data() as Solicitacao).abertaEm ?? "")
    .filter(Boolean)
    .sort()[0];

  const dias = maisAntigo
    ? Math.floor(
        (agora.getTime() - Date.parse(maisAntigo)) / 86_400_000,
      )
    : 0;

  return {
    chave: "solicitacoes",
    titulo: "Pedidos da família esperando",
    valor: String(abertos.length),
    detalhe:
      dias > 0
        ? `O mais antigo está há ${dias} ${plural(dias, "dia", "dias")} na fila`
        : "Abertos hoje",
    href: "/gestao/solicitacoes",
    gravidade: dias > 3 ? "alta" : "media",
  };
}

/**
 * As turmas recebidas já vêm no escopo de quem chama — para o professor,
 * as dele. Não há recorte extra aqui.
 */
async function chamadaDeHoje(
  turmas: Array<{ id: string; codigo: string }>,
  agora: Date,
): Promise<Pendencia | null> {
  if (!ehDiaLetivo(agora)) return null;

  const hoje = agora.toISOString().slice(0, 10);

  const docs = await getAdminDb()
    .collection(COLECOES.frequenciaDiaria)
    .where("data", "==", hoje)
    .get();

  const lancadas = new Set(
    docs.docs.map((doc) => (doc.data() as FrequenciaDiaria).turmaId),
  );

  const faltando = turmasSemChamada(turmas, lancadas);

  return {
    chave: "chamada",
    titulo: "Chamada de hoje",
    valor: String(faltando.length),
    detalhe:
      faltando.length > 0
        ? `${plural(faltando.length, "turma", "turmas")} sem lançamento: ${faltando
            .slice(0, 4)
            .map((t) => t.codigo)
            .join(", ")}${faltando.length > 4 ? "…" : ""}`
        : "",
    href: "/gestao/frequencia",
    gravidade: "media",
  };
}

async function riscoDeReprovacaoPorFalta(
  matriculas: string[],
  alunos: Array<{ matricula: string; nome: string }>,
): Promise<Pendencia> {
  const docs = await getAdminDb().collection(COLECOES.frequenciaDiaria).get();

  const porAluno = new Map<string, SituacaoDePresenca[]>();
  for (const doc of docs.docs) {
    const registro = doc.data() as FrequenciaDiaria;
    if (!matriculas.includes(registro.matricula)) continue;

    porAluno.set(registro.matricula, [
      ...(porAluno.get(registro.matricula) ?? []),
      registro.situacao as SituacaoDePresenca,
    ]);
  }

  const emRisco = abaixoDaFrequencia(
    alunos.map((aluno) => ({
      matricula: aluno.matricula,
      nome: aluno.nome,
      percentual: percentualDePresenca(contar(porAluno.get(aluno.matricula) ?? [])),
    })),
  );

  return {
    chave: "frequencia",
    titulo: "Risco de reprovação por falta",
    valor: String(emRisco.length),
    detalhe:
      emRisco.length > 0
        ? `Abaixo de 75%. O pior: ${emRisco[0].nome} com ${Math.round((emRisco[0].percentual ?? 0) * 100)}%`
        : "",
    href: "/gestao/frequencia/relatorio",
    gravidade: "alta",
  };
}

async function boletinsNaoLiberados(
  alunos: Array<{ matricula: string }>,
  anoLetivo: number,
  trimestre: number,
): Promise<Pendencia> {
  const docs = await getAdminDb().collection(COLECOES.boletins).get();

  const liberadosPorAluno = new Map(
    docs.docs
      .map((doc) => doc.data() as Boletim)
      .filter((b) => b.anoLetivo === anoLetivo)
      .map((b) => [b.matricula, trimestresLiberados(b)] as const),
  );

  const faltando = semTrimestreLiberado(
    alunos.map((aluno) => ({
      matricula: aluno.matricula,
      liberados: liberadosPorAluno.get(aluno.matricula) ?? [],
    })),
    String(trimestre),
  );

  return {
    chave: "boletins",
    titulo: `Boletins do ${trimestre}º trimestre não liberados`,
    valor: String(faltando.length),
    detalhe:
      faltando.length > 0
        ? `A família não vê nota nenhuma até a liberação`
        : "",
    href: "/gestao/boletins",
    gravidade: "media",
  };
}

async function situacaoFinanceira(
  matriculas: string[],
  agora: Date,
  podeLancar: boolean,
): Promise<Pendencia[]> {
  const docs = await getAdminDb().collection(COLECOES.cobrancas).get();

  const noEscopo = docs.docs
    .map((doc) => doc.data() as Cobranca)
    .filter((c) => matriculas.includes(c.matricula));

  const vencidas = noEscopo.filter(
    (c) => situacaoDaCobranca(c, agora) === "vencida",
  );

  const total = vencidas.reduce(
    (soma, c) => soma + ((c.valor ?? 0) - (c.valorPago ?? 0)),
    0,
  );

  const pendencias: Pendencia[] = [
    {
      chave: "vencido",
      titulo: "Vencido em aberto",
      valor: vencidas.length === 0 ? "0" : formatCurrency(total),
      detalhe: `${vencidas.length} ${plural(vencidas.length, "parcela", "parcelas")} de ${
        new Set(vencidas.map((c) => c.matricula)).size
      } ${plural(new Set(vencidas.map((c) => c.matricula)).size, "aluno", "alunos")}`,
      href: "/gestao/financeiro/relatorio",
      gravidade: "alta",
    },
  ];

  if (podeLancar) {
    // `false` explícito: ausente é parcela migrada, que conta como
    // conferida (ver docs/financeiro.md).
    const aConfirmar = noEscopo.filter((c) => c.confirmado === false);

    pendencias.push({
      chave: "a-confirmar",
      titulo: "Pagamentos a confirmar",
      valor: String(aConfirmar.length),
      detalhe:
        aConfirmar.length > 0
          ? "A família pagou; falta a conferência no extrato"
          : "",
      href: "/gestao/financeiro",
      gravidade: "baixa",
    });
  }

  return pendencias;
}
