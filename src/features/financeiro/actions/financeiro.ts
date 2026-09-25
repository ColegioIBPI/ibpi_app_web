"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import {
  cobrancaSchema,
  COLECOES,
  dataSchema,
  formaDePagamentoSchema,
  planoDePagamentoSchema,
  tipoDeCobrancaSchema,
  type Cobranca,
  type PlanoDePagamento,
} from "@/core/modelo";
import { obterAlunoVisivel } from "@/features/alunos/services/alunos.server";
import { gerarParcelas } from "@/features/financeiro/domain/plano";
import { idDaParcela } from "@/features/financeiro/services/financeiro.server";

/**
 * Escrita do financeiro.
 *
 * Nenhum dinheiro passa pelo sistema: isto registra o que já aconteceu no
 * banco ou no caixa do colégio. Toda gravação passa por
 * `gravarComAuditoria` — financeiro é um dos três dados que o colégio
 * precisa saber quem mudou e quando (README, seção 6.3).
 *
 * Quem escreve é o perfil financeiro (e secretaria/coordenação não: elas
 * têm apenas leitura no recurso, ver a matriz em `core/auth/roles.ts`).
 */

export interface ResultadoFinanceiro {
  ok: boolean;
  erro?: string;
  /** Quantas parcelas foram criadas ou alteradas. */
  parcelas?: number;
}

const planoSchema = z.object({
  matricula: z.string().min(1),
  valor: z.number().positive("Informe o valor total do plano."),
  parcelas: z.number().int().positive(),
  primeiroVencimento: dataSchema,
  tipo: tipoDeCobrancaSchema.default("mensalidade"),
  observacoes: z.string().trim().nullable().default(null),
});

export type EntradaDoPlano = z.infer<typeof planoSchema>;

/**
 * Cria o carnê de um plano de pagamento.
 *
 * Recusa quando alguma parcela gerada já existe: refazer o plano por cima
 * de um carnê já aberto apagaria baixas que a secretaria lançou.
 */
export async function criarPlanoDePagamento(
  dados: EntradaDoPlano,
): Promise<ResultadoFinanceiro> {
  const entrada = planoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("financeiro", "lancar");

  const aluno = await obterAlunoVisivel(sessao, entrada.data.matricula);
  if (!aluno) return { ok: false, erro: "Aluno não encontrado." };

  const { parcelas, erro } = gerarParcelas(entrada.data);
  if (erro) return { ok: false, erro };

  const db = getAdminDb();
  const referencias = parcelas.map((parcela) =>
    db
      .collection(COLECOES.cobrancas)
      .doc(
        idDaParcela(
          entrada.data.matricula,
          parcela.vencimento,
          parcela.parcela,
          parcela.totalDeParcelas,
        ),
      ),
  );

  const existentes = await db.getAll(...referencias);
  const jaAbertas = existentes.filter((doc) => doc.exists);

  if (jaAbertas.length > 0) {
    return {
      ok: false,
      erro: `Já existe um carnê com essas parcelas (${jaAbertas.length} de ${parcelas.length}). Apague as parcelas antigas antes de gerar outro.`,
    };
  }

  for (const [indice, parcela] of parcelas.entries()) {
    const cobranca = cobrancaSchema.safeParse({
      matricula: entrada.data.matricula,
      vencimento: parcela.vencimento,
      tipo: entrada.data.tipo,
      parcela: parcela.parcela,
      totalDeParcelas: parcela.totalDeParcelas,
      valor: parcela.valor,
      valorPago: null,
      dataPagamento: null,
      observacoes: entrada.data.observacoes,
      origem: "portal",
    });

    if (!cobranca.success) {
      return { ok: false, erro: cobranca.error.issues[0]?.message };
    }

    await gravarComAuditoria({
      colecao: COLECOES.cobrancas,
      documentoId: referencias[indice].id,
      antes: null,
      depois: cobranca.data,
      autor: sessao,
    });
  }

  revalidar(entrada.data.matricula);

  return { ok: true, parcelas: parcelas.length };
}

const parcelaSchema = z.object({
  matricula: z.string().min(1),
  vencimento: dataSchema,
  tipo: tipoDeCobrancaSchema,
  parcela: z.number().int().positive().nullable().default(null),
  totalDeParcelas: z.number().int().positive().nullable().default(null),
  valor: z.number().min(0, "O valor não pode ser negativo."),
  observacoes: z.string().trim().nullable().default(null),
});

export type EntradaDaParcela = z.infer<typeof parcelaSchema>;

/**
 * Cria uma parcela isolada.
 *
 * O carnê cobre a anuidade; isto cobre o resto — taxa de material lançada em
 * março, uma dependência, um extra. O id é gerado pelo Firestore, e não
 * montado a partir de matrícula e vencimento como no carnê: duas cobranças
 * avulsas podem cair legitimamente no mesmo dia, e um id determinístico
 * faria a segunda sobrescrever a primeira em silêncio.
 */
export async function criarCobranca(
  dados: EntradaDaParcela,
): Promise<ResultadoFinanceiro> {
  const entrada = parcelaSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("financeiro", "lancar");

  const aluno = await obterAlunoVisivel(sessao, entrada.data.matricula);
  if (!aluno) return { ok: false, erro: "Aluno não encontrado." };

  const cobranca = cobrancaSchema.safeParse({
    ...entrada.data,
    valorPago: null,
    dataPagamento: null,
    origem: "portal",
  });

  if (!cobranca.success) {
    return { ok: false, erro: cobranca.error.issues[0]?.message };
  }

  const referencia = getAdminDb().collection(COLECOES.cobrancas).doc();

  await gravarComAuditoria({
    colecao: COLECOES.cobrancas,
    documentoId: referencia.id,
    antes: null,
    depois: cobranca.data,
    autor: sessao,
  });

  revalidar(entrada.data.matricula);

  return { ok: true, parcelas: 1 };
}

const baixaSchema = z.object({
  id: z.string().min(1),
  dataPagamento: dataSchema,
  valorPago: z.number().min(0, "O valor pago não pode ser negativo."),
  formaDePagamento: formaDePagamentoSchema.nullable().default(null),
  recibo: z.string().trim().nullable().default(null),
  observacoes: z.string().trim().nullable().default(null),
  confirmado: z.boolean().default(true),
});

/** Baixa manual: registra o pagamento que já aconteceu. */
export async function darBaixa(
  dados: z.infer<typeof baixaSchema>,
): Promise<ResultadoFinanceiro> {
  const entrada = baixaSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("financeiro", "lancar");
  const contexto = await abrir(sessao, entrada.data.id);
  if ("erro" in contexto) return { ok: false, erro: contexto.erro };

  await gravarComAuditoria({
    colecao: COLECOES.cobrancas,
    documentoId: entrada.data.id,
    antes: contexto.cobranca,
    depois: {
      dataPagamento: entrada.data.dataPagamento,
      valorPago: entrada.data.valorPago,
      formaDePagamento: entrada.data.formaDePagamento,
      recibo: entrada.data.recibo,
      observacoes: entrada.data.observacoes,
      confirmado: entrada.data.confirmado,
      baixadoPor: sessao.uid,
    },
    autor: sessao,
  });

  revalidar(contexto.cobranca.matricula);

  return { ok: true, parcelas: 1 };
}

/**
 * Marca ou desmarca o pagamento como confirmado.
 *
 * Separado da baixa porque a conferência costuma acontecer depois: o
 * pagamento entra no dia em que a família avisa, e o extrato bancário chega
 * no dia seguinte.
 */
export async function confirmarPagamento(
  id: string,
  confirmado: boolean,
): Promise<ResultadoFinanceiro> {
  const sessao = await exigirPermissao("financeiro", "lancar");
  const contexto = await abrir(sessao, id);
  if ("erro" in contexto) return { ok: false, erro: contexto.erro };

  if (!contexto.cobranca.dataPagamento) {
    return { ok: false, erro: "Esta parcela ainda não tem pagamento." };
  }

  await gravarComAuditoria({
    colecao: COLECOES.cobrancas,
    documentoId: id,
    antes: contexto.cobranca,
    depois: { confirmado },
    autor: sessao,
  });

  revalidar(contexto.cobranca.matricula);

  return { ok: true, parcelas: 1 };
}

/**
 * Desfaz a baixa.
 *
 * Existe porque baixa lançada na parcela errada acontece, e sem isto a
 * correção seria apagar a parcela e recriá-la — o que levaria junto o
 * histórico dela.
 */
export async function desfazerBaixa(id: string): Promise<ResultadoFinanceiro> {
  const sessao = await exigirPermissao("financeiro", "lancar");
  const contexto = await abrir(sessao, id);
  if ("erro" in contexto) return { ok: false, erro: contexto.erro };

  if (!contexto.cobranca.dataPagamento) {
    return { ok: false, erro: "Esta parcela não tem baixa para desfazer." };
  }

  await gravarComAuditoria({
    colecao: COLECOES.cobrancas,
    documentoId: id,
    antes: contexto.cobranca,
    depois: {
      dataPagamento: null,
      valorPago: null,
      formaDePagamento: null,
      banco: null,
      recibo: null,
      confirmado: null,
      baixadoPor: sessao.uid,
    },
    autor: sessao,
  });

  revalidar(contexto.cobranca.matricula);

  return { ok: true, parcelas: 1 };
}

const edicaoSchema = z.object({
  id: z.string().min(1),
  vencimento: dataSchema,
  tipo: tipoDeCobrancaSchema,
  parcela: z.number().int().positive().nullable().default(null),
  totalDeParcelas: z.number().int().positive().nullable().default(null),
  valor: z.number().min(0, "O valor não pode ser negativo."),
  observacoes: z.string().trim().nullable().default(null),
});

/**
 * Corrige uma parcela.
 *
 * Mexe no que foi **cobrado**; o que foi **pago** se corrige pela baixa. São
 * dois fatos distintos, e um formulário que alterasse os dois juntos deixaria
 * a auditoria sem dizer qual deles a pessoa quis corrigir.
 */
export async function editarCobranca(
  dados: z.infer<typeof edicaoSchema>,
): Promise<ResultadoFinanceiro> {
  const entrada = edicaoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("financeiro", "lancar");
  const contexto = await abrir(sessao, entrada.data.id);
  if ("erro" in contexto) return { ok: false, erro: contexto.erro };

  await gravarComAuditoria({
    colecao: COLECOES.cobrancas,
    documentoId: entrada.data.id,
    antes: contexto.cobranca,
    depois: {
      vencimento: entrada.data.vencimento,
      tipo: entrada.data.tipo,
      parcela: entrada.data.parcela,
      totalDeParcelas: entrada.data.totalDeParcelas,
      valor: entrada.data.valor,
      observacoes: entrada.data.observacoes,
    },
    autor: sessao,
  });

  revalidar(contexto.cobranca.matricula);

  return { ok: true, parcelas: 1 };
}

/**
 * Apaga uma parcela.
 *
 * Só o que ainda não foi pago: apagar uma parcela quitada sumiria com o
 * registro de um pagamento que a família fez, e é exatamente esse registro
 * que o colégio precisa quando a família contesta.
 */
export async function removerCobranca(
  id: string,
): Promise<ResultadoFinanceiro> {
  const sessao = await exigirPermissao("financeiro", "lancar");
  const contexto = await abrir(sessao, id);
  if ("erro" in contexto) return { ok: false, erro: contexto.erro };

  if (contexto.cobranca.dataPagamento) {
    return {
      ok: false,
      erro: "Parcela paga não pode ser apagada. Desfaça a baixa primeiro.",
    };
  }

  const db = getAdminDb();
  const lote = db.batch();
  const agora = new Date().toISOString();

  lote.delete(db.collection(COLECOES.cobrancas).doc(id));
  lote.set(db.collection(COLECOES.auditoria).doc(), {
    colecao: COLECOES.cobrancas,
    documentoId: id,
    acao: "removeu",
    alteracoes: {},
    autorUid: sessao.uid,
    autorNome: sessao.nome,
    autorPerfil: sessao.role,
    em: agora,
  });

  await lote.commit();

  revalidar(contexto.cobranca.matricula);

  return { ok: true, parcelas: 1 };
}

const planoAcordadoSchema = z.object({
  matricula: z.string().min(1),
  texto: z.string().trim().min(1, "Escreva o plano acordado."),
});

/**
 * Grava o plano de pagamento acordado na matrícula.
 *
 * Um documento por aluno, com a matrícula como id: o plano é do aluno, não
 * um registro que se acumula. O histórico do que mudou fica na auditoria,
 * que é onde se procura "quem alterou a condição que a família tinha".
 */
export async function salvarPlanoAcordado(
  dados: z.infer<typeof planoAcordadoSchema>,
): Promise<ResultadoFinanceiro> {
  const entrada = planoAcordadoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("financeiro", "lancar");

  const aluno = await obterAlunoVisivel(sessao, entrada.data.matricula);
  if (!aluno) return { ok: false, erro: "Aluno não encontrado." };

  const referencia = getAdminDb()
    .collection(COLECOES.planosDePagamento)
    .doc(entrada.data.matricula);

  const atual = await referencia.get();

  const plano = planoDePagamentoSchema.safeParse({
    matricula: entrada.data.matricula,
    texto: entrada.data.texto,
    atualizadoPorNome: sessao.nome,
    origem: "portal",
  });

  if (!plano.success) {
    return { ok: false, erro: plano.error.issues[0]?.message };
  }

  await gravarComAuditoria({
    colecao: COLECOES.planosDePagamento,
    documentoId: referencia.id,
    antes: atual.exists ? (atual.data() as PlanoDePagamento) : null,
    depois: plano.data,
    autor: sessao,
  });

  revalidar(entrada.data.matricula);

  return { ok: true };
}

/** Carrega a cobrança e verifica o escopo do aluno dela. */
async function abrir(
  sessao: Awaited<ReturnType<typeof exigirPermissao>>,
  id: string,
) {
  const doc = await getAdminDb().collection(COLECOES.cobrancas).doc(id).get();

  if (!doc.exists) return { erro: "Parcela não encontrada." as const };

  const cobranca = doc.data() as Cobranca;

  // Mesma resposta para parcela inexistente e para aluno fora do escopo.
  const aluno = await obterAlunoVisivel(sessao, cobranca.matricula);
  if (!aluno) return { erro: "Parcela não encontrada." as const };

  return { cobranca };
}

function revalidar(matricula: string) {
  revalidatePath("/gestao/financeiro");
  revalidatePath(`/gestao/financeiro/${matricula}`);
  revalidatePath("/portal/financeiro");
}
