import "server-only";

import {
  COLECOES,
  type Cobranca,
  type Contrato,
  type SituacaoDaCobranca,
} from "@/core/modelo";
import type { SessionUser } from "@/core/auth/session";
import { getAdminDb } from "@/core/firebase/admin";
import {
  listarAlunosVisiveis,
  obterAlunoVisivel,
} from "@/features/alunos/services/alunos.server";
import {
  ordenarPorVencimento,
  situacaoDaCobranca,
  totalizar,
  type Totais,
} from "@/features/financeiro/domain/cobranca";

/**
 * Leitura do financeiro.
 *
 * O escopo de aluno é o mesmo do resto do sistema, aplicado aqui porque o
 * Admin SDK ignora as Security Rules. O responsável vê o extrato dos filhos,
 * e só de leitura; o aluno não vê financeiro nenhum (README, seção 3.1).
 */

export interface CobrancaComId extends Cobranca {
  id: string;
  /** Concluída na leitura, nunca lida do banco. */
  situacaoAtual: SituacaoDaCobranca;
}

export interface ExtratoDoAluno {
  matricula: string;
  nome: string;
  turmaCodigo: string | null;
  cobrancas: CobrancaComId[];
  contratos: Contrato[];
  totais: Totais;
}

/**
 * Extrato de um aluno, se a sessão tiver direito de vê-lo.
 *
 * `null` para aluno fora do escopo — quem chama responde 404.
 */
export async function extratoDoAluno(
  sessao: SessionUser,
  matricula: string,
  hoje: Date = new Date(),
): Promise<ExtratoDoAluno | null> {
  const aluno = await obterAlunoVisivel(sessao, matricula);
  if (!aluno) return null;

  const db = getAdminDb();

  const [cobrancasDocs, contratosDocs] = await Promise.all([
    db.collection(COLECOES.cobrancas).where("matricula", "==", matricula).get(),
    db.collection(COLECOES.contratos).where("matricula", "==", matricula).get(),
  ]);

  const cobrancas = ordenarPorVencimento(
    cobrancasDocs.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Cobranca),
    })),
  ).map((cobranca) => ({
    ...(cobranca as Cobranca & { id: string }),
    situacaoAtual: situacaoDaCobranca(cobranca, hoje),
  }));

  return {
    matricula,
    nome: aluno.nome,
    turmaCodigo: aluno.turmaCodigo ?? null,
    cobrancas,
    contratos: contratosDocs.docs
      .map((doc) => doc.data() as Contrato)
      .sort((a, b) => (a.data ?? "").localeCompare(b.data ?? "")),
    totais: totalizar(cobrancas, hoje),
  };
}

export interface LinhaDeInadimplencia {
  matricula: string;
  nome: string;
  turmaCodigo: string | null;
  totais: Totais;
  /** Vencimento mais antigo ainda em aberto. */
  vencidaDesde: string | null;
}

/**
 * Situação financeira de todos os alunos no escopo da sessão.
 *
 * Carrega as 847 cobranças e cruza em memória. Com uma base uma ordem de
 * grandeza maior isto vira consulta agregada — mas somar em memória 847
 * documentos é mais rápido, e mais simples de conferir, que manter um total
 * denormalizado que pode ficar errado.
 */
export async function situacaoFinanceiraDaEscola(
  sessao: SessionUser,
  hoje: Date = new Date(),
): Promise<LinhaDeInadimplencia[]> {
  const [alunos, cobrancasDocs] = await Promise.all([
    listarAlunosVisiveis(sessao),
    getAdminDb().collection(COLECOES.cobrancas).get(),
  ]);

  const porMatricula = new Map<string, Cobranca[]>();
  for (const doc of cobrancasDocs.docs) {
    const cobranca = doc.data() as Cobranca;
    const atuais = porMatricula.get(cobranca.matricula) ?? [];
    atuais.push(cobranca);
    porMatricula.set(cobranca.matricula, atuais);
  }

  return alunos
    .map((aluno) => {
      const cobrancas = porMatricula.get(aluno.matricula) ?? [];
      const vencidas = cobrancas.filter(
        (cobranca) => situacaoDaCobranca(cobranca, hoje) === "vencida",
      );

      return {
        matricula: aluno.matricula,
        nome: aluno.nome,
        turmaCodigo: aluno.turmaCodigo ?? null,
        totais: totalizar(cobrancas, hoje),
        vencidaDesde:
          vencidas.length === 0
            ? null
            : ordenarPorVencimento(vencidas)[0].vencimento,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Id determinístico de uma parcela criada pelo Portal. */
export function idDaParcela(
  matricula: string,
  vencimento: string,
  parcela: number,
  totalDeParcelas: number,
): string {
  return `${matricula}-${vencimento}-${parcela}de${totalDeParcelas}-portal`;
}
