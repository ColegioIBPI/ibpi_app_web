import "server-only";

import {
  COLECOES,
  ROTULOS_DE_OCORRENCIA,
  ROTULOS_DE_PRESENCA,
  ROTULOS_DE_SEGMENTO,
  ROTULOS_DE_TURNO,
  type FrequenciaDiaria,
} from "@/core/modelo";
import type { SessionUser } from "@/core/auth/session";
import { montarPlanilha, type Coluna } from "@/core/exportacao/planilha";
import { getAdminDb } from "@/core/firebase/admin";
import {
  listarAlunosVisiveis,
  type AlunoComId,
} from "@/features/alunos/services/alunos.server";
import { filtrarLinhas, type RecorteFinanceiro } from "@/features/financeiro/domain/lista";
import {
  situacaoFinanceiraDaEscola,
  type LinhaDeInadimplencia,
} from "@/features/financeiro/services/financeiro.server";

/**
 * As listas que a secretaria exporta.
 *
 * Cada função devolve o `.xlsx` já montado, e **aplica o escopo da sessão**
 * antes: a planilha é uma cópia de dado pessoal de aluno menor de idade
 * saindo do sistema, então ela nunca pode conter mais do que a tela conteria
 * para a mesma pessoa.
 */

const COLUNAS_DE_ALUNO: Coluna<AlunoComId>[] = [
  { titulo: "Matrícula", tipo: "texto", largura: 12, valor: (a) => a.matricula },
  { titulo: "Aluno", tipo: "texto", largura: 38, valor: (a) => a.nome },
  { titulo: "Turma", tipo: "texto", valor: (a) => a.turmaCodigo },
  {
    titulo: "Segmento",
    tipo: "texto",
    largura: 22,
    valor: (a) => (a.segmento ? ROTULOS_DE_SEGMENTO[a.segmento] : null),
  },
  {
    titulo: "Turno",
    tipo: "texto",
    valor: (a) => (a.turno ? ROTULOS_DE_TURNO[a.turno] : null),
  },
  {
    titulo: "Nascimento",
    tipo: "data",
    valor: (a) => a.dataNascimento ?? null,
  },
  { titulo: "CPF", tipo: "texto", valor: (a) => a.cpf ?? null },
  {
    titulo: "Responsável (mãe)",
    tipo: "texto",
    largura: 34,
    valor: (a) => a.filiacao?.mae ?? null,
  },
  {
    titulo: "Responsável (pai)",
    tipo: "texto",
    largura: 34,
    valor: (a) => a.filiacao?.pai ?? null,
  },
  {
    titulo: "Telefones",
    tipo: "texto",
    largura: 28,
    valor: (a) => (a.contato?.telefones ?? []).join(" / ") || null,
  },
  {
    titulo: "E-mails",
    tipo: "texto",
    largura: 34,
    valor: (a) => (a.contato?.emails ?? []).join(" / ") || null,
  },
  {
    titulo: "Situação",
    tipo: "texto",
    valor: (a) => (a.ativo ? "Matriculado" : "Inativo"),
  },
];

export async function planilhaDeAlunos(
  sessao: SessionUser,
  filtro: { turma?: string; incluirInativos?: boolean } = {},
): Promise<Buffer> {
  const alunos = (await listarAlunosVisiveis(sessao))
    .filter((aluno) => filtro.incluirInativos || aluno.ativo)
    .filter((aluno) => !filtro.turma || aluno.turmaCodigo === filtro.turma)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return montarPlanilha({
    aba: "Alunos",
    colunas: COLUNAS_DE_ALUNO,
    linhas: alunos,
  });
}

const COLUNAS_DE_INADIMPLENCIA: Coluna<LinhaDeInadimplencia>[] = [
  { titulo: "Matrícula", tipo: "texto", largura: 12, valor: (l) => l.matricula },
  { titulo: "Aluno", tipo: "texto", largura: 38, valor: (l) => l.nome },
  { titulo: "Turma", tipo: "texto", valor: (l) => l.turmaCodigo },
  {
    titulo: "Parcelas",
    tipo: "numero",
    valor: (l) => l.totais.parcelas,
  },
  { titulo: "Contratado", tipo: "moeda", largura: 16, valor: (l) => l.totais.contratado },
  { titulo: "Pago", tipo: "moeda", largura: 16, valor: (l) => l.totais.pago },
  { titulo: "Em aberto", tipo: "moeda", largura: 16, valor: (l) => l.totais.emAberto },
  { titulo: "Vencido", tipo: "moeda", largura: 16, valor: (l) => l.totais.vencido },
  {
    titulo: "Vencida desde",
    tipo: "data",
    largura: 16,
    valor: (l) => l.vencidaDesde,
  },
];

export async function planilhaDeInadimplencia(
  sessao: SessionUser,
  filtro: { turma?: string; recorte?: RecorteFinanceiro } = {},
): Promise<Buffer> {
  const linhas = filtrarLinhas(await situacaoFinanceiraDaEscola(sessao), {
    turma: filtro.turma,
    recorte: filtro.recorte,
  });

  return montarPlanilha({
    aba: "Inadimplência",
    colunas: COLUNAS_DE_INADIMPLENCIA,
    linhas,
  });
}

export interface LinhaDeFrequencia extends FrequenciaDiaria {
  nome: string;
}

const COLUNAS_DE_FREQUENCIA: Coluna<LinhaDeFrequencia>[] = [
  { titulo: "Data", tipo: "data", largura: 12, valor: (l) => l.data },
  { titulo: "Matrícula", tipo: "texto", largura: 12, valor: (l) => l.matricula },
  { titulo: "Aluno", tipo: "texto", largura: 38, valor: (l) => l.nome },
  { titulo: "Turma", tipo: "texto", valor: (l) => l.turmaId },
  {
    titulo: "Situação",
    tipo: "texto",
    valor: (l) => ROTULOS_DE_PRESENCA[l.situacao],
  },
  { titulo: "Aula", tipo: "numero", valor: (l) => l.aula ?? null },
  {
    titulo: "Ocorrência",
    tipo: "texto",
    largura: 26,
    valor: (l) => (l.ocorrencia ? ROTULOS_DE_OCORRENCIA[l.ocorrencia] : null),
  },
  { titulo: "Observação", tipo: "texto", largura: 40, valor: (l) => l.observacao ?? null },
];

/**
 * Frequência de uma turma num período.
 *
 * O período é obrigatório: sem ele a consulta traria o ano letivo inteiro de
 * todo mundo, e a planilha deixaria de responder a pergunta que motivou o
 * pedido.
 */
export async function planilhaDeFrequencia(
  sessao: SessionUser,
  filtro: { turmaId: string; de: string; ate: string },
): Promise<Buffer> {
  const alunos = await listarAlunosVisiveis(sessao);
  const permitidos = new Map(alunos.map((aluno) => [aluno.matricula, aluno]));

  const docs = await getAdminDb()
    .collection(COLECOES.frequenciaDiaria)
    .where("turmaId", "==", filtro.turmaId)
    .where("data", ">=", filtro.de)
    .where("data", "<=", filtro.ate)
    .get();

  const linhas = docs.docs
    .map((doc) => doc.data() as FrequenciaDiaria)
    // O escopo da sessão vale aqui também: o professor só exporta as turmas
    // que leciona, e o filtro por turma sozinho não garante isso.
    .filter((lancamento) => permitidos.has(lancamento.matricula))
    .map((lancamento) => ({
      ...lancamento,
      nome: permitidos.get(lancamento.matricula)?.nome ?? lancamento.matricula,
    }))
    .sort(
      (a, b) =>
        a.data.localeCompare(b.data) || a.nome.localeCompare(b.nome, "pt-BR"),
    );

  return montarPlanilha({
    aba: "Frequência",
    colunas: COLUNAS_DE_FREQUENCIA,
    linhas,
  });
}
