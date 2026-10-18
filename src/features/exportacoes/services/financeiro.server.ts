import "server-only";

import type { SessionUser } from "@/core/auth/session";
import { montarPlanilha, type Coluna } from "@/core/exportacao/planilha";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type Responsavel } from "@/core/modelo";
import { listarAlunosVisiveis } from "@/features/alunos/services/alunos.server";
import {
  aVencerAte,
  descreverResponsaveis,
  formatarCPF,
  parcelasAbertas,
  responsavelParaCobranca,
  somenteVencidas,
  telefoneDoResponsavel,
  tipoDoResponsavel,
  type CobrancaComId,
  type ParcelaAberta,
  type ResponsavelDoRelatorio,
} from "@/features/financeiro/domain/abertas";
import { ROTULOS_DE_TIPO_DE_RESPONSAVEL } from "@/core/modelo";

/**
 * Os dois relatórios de cobrança, **uma linha por parcela**.
 *
 * Antes era uma linha por aluno, com os valores somados. Quem vai cobrar
 * precisa do contrário: qual parcela, de que mês, vencida há quanto tempo.
 * Um total não diz se são três mensalidades atrasadas ou a taxa de material
 * de março — e a conversa com a família é sobre a parcela.
 */

/** A parcela com os responsáveis do aluno já anexados. */
interface LinhaDeCobranca extends ParcelaAberta {
  responsaveis: ResponsavelDoRelatorio[];
}

const COLUNAS: Coluna<LinhaDeCobranca>[] = [
  { titulo: "Vencimento", tipo: "data", largura: 14, valor: (l) => l.vencimento },
  { titulo: "Matrícula", tipo: "texto", largura: 12, valor: (l) => l.matricula },
  { titulo: "Aluno", tipo: "texto", largura: 38, valor: (l) => l.nome },
  { titulo: "Turma", tipo: "texto", valor: (l) => l.turmaCodigo },
  { titulo: "Descrição", tipo: "texto", largura: 20, valor: (l) => l.descricao },
  { titulo: "Parcela", tipo: "texto", largura: 10, valor: (l) => l.parcela },
  { titulo: "Valor", tipo: "moeda", largura: 14, valor: (l) => l.valor },
  { titulo: "Pago", tipo: "moeda", largura: 14, valor: (l) => l.valorPago },
  { titulo: "Saldo", tipo: "moeda", largura: 14, valor: (l) => l.saldo },
  {
    titulo: "Dias de atraso",
    tipo: "numero",
    largura: 14,
    valor: (l) => l.diasDeAtraso,
  },

  /*
   * O responsável financeiro ganha colunas próprias, além da lista com
   * todos: é o dado que a pessoa procura ao abrir a planilha, e caçá-lo no
   * meio de uma célula com três nomes é o atrito que faz alguém ligar para
   * a mãe errada.
   */
  {
    titulo: "Responsável financeiro",
    tipo: "texto",
    largura: 34,
    valor: (l) => responsavelParaCobranca(l.responsaveis)?.nome ?? null,
  },
  {
    titulo: "CPF",
    tipo: "texto",
    largura: 18,
    valor: (l) => formatarCPF(responsavelParaCobranca(l.responsaveis)?.cpf),
  },
  {
    titulo: "Tipo",
    tipo: "texto",
    largura: 22,
    valor: (l) => {
      const responsavel = responsavelParaCobranca(l.responsaveis);
      return responsavel
        ? ROTULOS_DE_TIPO_DE_RESPONSAVEL[tipoDoResponsavel(responsavel)]
        : null;
    },
  },
  {
    titulo: "Telefone",
    tipo: "texto",
    largura: 18,
    valor: (l) => telefoneDoResponsavel(responsavelParaCobranca(l.responsaveis)),
  },
  {
    titulo: "Responsáveis (todos)",
    tipo: "texto",
    largura: 60,
    valor: (l) => descreverResponsaveis(l.responsaveis) || null,
  },
];

/**
 * Carrega parcelas, alunos e responsáveis e cruza em memória.
 *
 * O escopo da sessão é aplicado pelos **alunos**: a planilha é cópia de
 * dado pessoal saindo do sistema, e parcela de aluno fora do escopo não
 * pode aparecer nem com o nome em branco.
 */
async function linhas(
  sessao: SessionUser,
  filtro: { turma?: string } = {},
  hoje = new Date(),
): Promise<LinhaDeCobranca[]> {
  const db = getAdminDb();

  const [alunos, cobrancasDocs, responsaveisDocs] = await Promise.all([
    listarAlunosVisiveis(sessao),
    db.collection(COLECOES.cobrancas).get(),
    db.collection(COLECOES.responsaveis).get(),
  ]);

  const noEscopo = alunos.filter(
    (aluno) => !filtro.turma || aluno.turmaCodigo === filtro.turma,
  );

  const porMatricula = new Map(
    noEscopo.map((aluno) => [
      aluno.matricula,
      {
        matricula: aluno.matricula,
        nome: aluno.nome,
        turmaCodigo: aluno.turmaCodigo ?? null,
      },
    ]),
  );

  const responsaveisPorAluno = new Map<string, ResponsavelDoRelatorio[]>();
  for (const doc of responsaveisDocs.docs) {
    const responsavel = doc.data() as Responsavel;

    for (const matricula of responsavel.alunosVinculados ?? []) {
      const atuais = responsaveisPorAluno.get(matricula) ?? [];
      atuais.push(responsavel);
      responsaveisPorAluno.set(matricula, atuais);
    }
  }

  const cobrancas = cobrancasDocs.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as CobrancaComId)
    .filter((cobranca) => porMatricula.has(cobranca.matricula));

  return parcelasAbertas(cobrancas, porMatricula, hoje).map((parcela) => ({
    ...parcela,
    responsaveis: responsaveisPorAluno.get(parcela.matricula) ?? [],
  }));
}

/** Parcelas **vencidas** — quem está devendo, e o quê. */
export async function planilhaDeInadimplentes(
  sessao: SessionUser,
  filtro: { turma?: string } = {},
): Promise<Buffer> {
  return montarPlanilha({
    aba: "Inadimplentes",
    colunas: COLUNAS,
    linhas: somenteVencidas(await linhas(sessao, filtro)),
  });
}

/**
 * Parcelas em aberto que vencem **até a data informada**.
 *
 * Inclui as já vencidas: quem pergunta "quanto entra até o dia 30" quer o
 * que ainda não entrou, e separar o atrasado faria somar duas planilhas
 * para responder uma pergunta. A coluna de atraso distingue.
 */
export async function planilhaDeValoresAReceber(
  sessao: SessionUser,
  ate: string,
  filtro: { turma?: string } = {},
): Promise<Buffer> {
  return montarPlanilha({
    aba: "Valores a receber",
    colunas: COLUNAS,
    linhas: aVencerAte(await linhas(sessao, filtro), ate),
  });
}
