"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { corpoDaAuditoria, gravarComAuditoria } from "@/core/auditoria/registrar";
import { calcularAlteracoes, semCamposTecnicos } from "@/core/auditoria/diferencas";
import { exigirPermissao } from "@/core/auth/guards";
import type { SessionUser } from "@/core/auth/session";
import { getAdminDb } from "@/core/firebase/admin";
import {
  COLECOES,
  ROTULOS_DE_TIPO_DE_COBRANCA,
  itemDoReciboSchema,
  reciboSchema,
  serieDeRecibosSchema,
  type Cobranca,
  type Recibo,
  type SerieDeRecibos,
  type TipoDeServico,
} from "@/core/modelo";
import { obterAlunoVisivel } from "@/features/alunos/services/alunos.server";
import {
  aindaQuitadaPor,
  dataNoBrasil,
  formaDaParcela,
  impedimentoParaQuitar,
  referenciaDaParcela,
  servicoDaParcela,
} from "@/features/recibos/domain/quitacao";
import { idDoRecibo, normalizarSerie } from "@/features/recibos/domain/recibo";

/**
 * Emissão e cancelamento de recibo.
 *
 * Quem emite é quem recebe o dinheiro: o financeiro e a secretaria — metade
 * da lista de serviços é cobrada no balcão dela.
 */

export interface ResultadoDoRecibo {
  ok: boolean;
  erro?: string;
  /** O id do recibo emitido, para a tela abrir direto na impressão. */
  id?: string;
}

const emissaoSchema = z.object({
  serie: z.string().trim().min(1),
  matricula: z.string().trim().min(1),
  itens: z.array(itemDoReciboSchema).min(1, "Lance pelo menos um item"),
  observacoes: z.string().trim().nullable().default(null),
});

export type FormularioDeRecibo = z.infer<typeof emissaoSchema>;

export async function emitirRecibo(
  dados: FormularioDeRecibo,
): Promise<ResultadoDoRecibo> {
  const entrada = emissaoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("recibos", "lancar");
  const serie = normalizarSerie(entrada.data.serie);

  // O aluno é lido pelo serviço com escopo, e não direto do banco: emitir
  // recibo para matrícula que não existe produziria um papel sem dono.
  const aluno = await obterAlunoVisivel(sessao, entrada.data.matricula);
  if (!aluno) {
    return { ok: false, erro: "Aluno não encontrado." };
  }

  const quitacoes = entrada.data.itens
    .map((item) => item.cobrancaId)
    .filter((id): id is string => Boolean(id));

  /**
   * **Emitir o recibo autoriza a baixa.** Quem recebe o dinheiro no balcão
   * é quem dá o papel, e na secretaria do IBPI isso inclui mensalidade —
   * então `recibos: lancar`, já exigido acima, é a permissão que vale.
   *
   * Não se confunde com `financeiro: lancar`, que continua restrito: pela
   * tela do financeiro se gera carnê, se edita valor e se apaga parcela.
   * Aqui o pagamento só entra como consequência de um recibo emitido, e
   * fica preso ao que o documento diz.
   */

  // Duas linhas apontando para a mesma parcela pagariam uma e sobrescreveriam
  // a outra, deixando o total do recibo maior que a baixa.
  if (new Set(quitacoes).size !== quitacoes.length) {
    return { ok: false, erro: "A mesma parcela está em dois itens do recibo." };
  }

  const db = getAdminDb();
  const serieRef = db.collection(COLECOES.seriesDeRecibo).doc(serie);
  const agora = new Date().toISOString();

  try {
    /**
     * **Transação, e não leitura seguida de escrita.**
     *
     * Duas pessoas emitindo ao mesmo tempo leriam o mesmo "próximo número"
     * e o colégio teria dois recibos nº 42 — descobertos semanas depois,
     * na conferência. A transação refaz a leitura quando alguém passa na
     * frente; o id determinístico é a segunda trava, porque criar um
     * documento que já existe falha.
     */
    const id = await db.runTransaction(async (transacao) => {
      // Toda leitura antes de toda escrita: é exigência da transação do
      // Firestore, e por isso as parcelas são lidas aqui em cima e não no
      // laço que grava a baixa.
      const serieDoc = await transacao.get(serieRef);

      const parcelas = new Map<string, FirebaseFirestore.DocumentSnapshot>();
      for (const cobrancaId of quitacoes) {
        parcelas.set(
          cobrancaId,
          await transacao.get(db.collection(COLECOES.cobrancas).doc(cobrancaId)),
        );
      }

      if (!serieDoc.exists) {
        throw new Error(`A série ${serie} não existe. Abra o talão primeiro.`);
      }

      const talao = serieDoc.data() as SerieDeRecibos;

      if (!talao.ativa) {
        throw new Error(`A série ${serie} está encerrada.`);
      }

      const numero = talao.proximoNumero;
      const documentoId = idDoRecibo(serie, numero);

      const recibo = reciboSchema.parse({
        serie,
        numero,
        status: "confirmado",
        emissorUid: sessao.uid,
        emissorNome: sessao.nome,
        emitidoEm: agora,
        aluno: {
          matricula: aluno.matricula,
          nome: aluno.nome,
          curso: aluno.segmento ?? null,
          serie: aluno.serie ?? null,
        },
        itens: entrada.data.itens,
        observacoes: entrada.data.observacoes,
        cancelamento: null,
        origem: "portal",
        criadoEm: agora,
        criadoPor: sessao.uid,
      });

      transacao.create(db.collection(COLECOES.recibos).doc(documentoId), recibo);
      transacao.update(serieRef, { proximoNumero: numero + 1 });

      // A baixa sai no mesmo commit do recibo: ou os dois existem, ou
      // nenhum. Um recibo impresso sem a baixa correspondente é o extrato
      // cobrando de novo quem já pagou, com o papel na mão para provar.
      for (const item of recibo.itens) {
        if (!item.cobrancaId) continue;

        const parcela = parcelas.get(item.cobrancaId);
        const impedimento = impedimentoParaQuitar(
          parcela?.exists ? (parcela.data() as Cobranca) : null,
          aluno.matricula,
        );

        if (impedimento) {
          throw new Error(`${impedimento.motivo} Recibo não emitido.`);
        }

        transacao.update(
          db.collection(COLECOES.cobrancas).doc(item.cobrancaId),
          {
            dataPagamento: dataNoBrasil(agora),
            valorPago: item.valor,
            formaDePagamento: formaDaParcela(item.formaDePagamento),
            recibo: documentoId,
            reciboId: documentoId,
            // Entra conferida, como toda baixa: quem emite o recibo está
            // com o dinheiro na mão.
            confirmado: true,
            baixadoPor: sessao.uid,
            atualizadoEm: agora,
            atualizadoPor: sessao.uid,
          },
        );
      }

      transacao.set(
        db.collection(COLECOES.auditoria).doc(),
        corpoDaAuditoria({
          colecao: COLECOES.recibos,
          documentoId,
          acao: "criou",
          alteracoes: semCamposTecnicos(calcularAlteracoes({}, recibo)),
          autor: sessao,
          em: agora,
        }),
      );

      return documentoId;
    });

    revalidatePath("/gestao/recibos");

    return { ok: true, id };
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Não foi possível emitir.",
    };
  }
}

const cancelamentoSchema = z.object({
  id: z.string().min(1),
  motivo: z.string().trim().min(3, "Diga por que o recibo foi cancelado"),
});

/**
 * Cancelar é o único jeito de corrigir um recibo.
 *
 * Editar faria o papel na mão da família discordar do sistema. O número
 * cancelado **não é reaproveitado**: a sequência com um buraco é o que
 * prova, na conferência, que o recibo existiu e foi anulado.
 */
export async function cancelarRecibo(
  dados: z.infer<typeof cancelamentoSchema>,
): Promise<ResultadoDoRecibo> {
  const entrada = cancelamentoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("recibos", "lancar");
  const db = getAdminDb();

  const referencia = db.collection(COLECOES.recibos).doc(entrada.data.id);
  const atual = await referencia.get();

  if (!atual.exists) {
    return { ok: false, erro: "Recibo não encontrado." };
  }

  const anterior = atual.data() as Recibo;

  if (anterior.status === "cancelado") {
    return { ok: false, erro: "Este recibo já está cancelado." };
  }

  const quitadas = anterior.itens
    .map((item) => item.cobrancaId)
    .filter((id): id is string => Boolean(id));

  // Quem emite cancela: o engano é de quem estava no balcão, e exigir
  // outra pessoa para desfazê-lo deixaria a parcela paga por um recibo
  // que já não vale.

  await gravarComAuditoria({
    colecao: COLECOES.recibos,
    documentoId: entrada.data.id,
    antes: anterior,
    depois: {
      status: "cancelado",
      cancelamento: {
        em: new Date().toISOString(),
        porNome: sessao.nome,
        motivo: entrada.data.motivo,
      },
    },
    autor: sessao,
  });

  await desfazerQuitacoes(quitadas, entrada.data.id, sessao);

  revalidatePath("/gestao/recibos");
  revalidatePath(`/gestao/recibos/${entrada.data.id}`);

  return { ok: true, id: entrada.data.id };
}

/**
 * Devolve as parcelas ao estado de em aberto, uma a uma e com auditoria.
 *
 * **Só as que ainda apontam para este recibo.** Se a parcela já foi paga
 * de novo por um recibo mais recente, limpar aqui apagaria o pagamento
 * válido — e a família passaria a dever uma mensalidade que pagou duas
 * vezes. É o erro mais caro possível nesta tela, e ele não aparece em
 * nenhum teste que não simule a reemissão.
 */
async function desfazerQuitacoes(
  cobrancaIds: string[],
  reciboId: string,
  sessao: SessionUser,
): Promise<void> {
  const db = getAdminDb();

  for (const cobrancaId of cobrancaIds) {
    const referencia = db.collection(COLECOES.cobrancas).doc(cobrancaId);
    const atual = await referencia.get();
    if (!atual.exists) continue;

    const cobranca = atual.data() as Cobranca;
    if (!aindaQuitadaPor(cobranca, reciboId)) continue;

    await gravarComAuditoria({
      colecao: COLECOES.cobrancas,
      documentoId: cobrancaId,
      antes: cobranca,
      depois: {
        dataPagamento: null,
        valorPago: null,
        formaDePagamento: null,
        recibo: null,
        reciboId: null,
        confirmado: null,
        baixadoPor: sessao.uid,
      },
      autor: sessao,
    });

    revalidatePath(`/gestao/financeiro/${cobranca.matricula}`);
  }
}

const aberturaDeSerieSchema = z.object({
  serie: z.string().trim().min(1).max(10),
  descricao: z.string().trim().nullable().default(null),
  /**
   * O **próximo** número a emitir. Quem já tem talão de papel no 847
   * informa 848 aqui, e o sistema não repete um recibo que está na gaveta.
   */
  proximoNumero: z.number().int().positive("O número precisa ser maior que zero"),
});

export async function abrirSerie(
  dados: z.infer<typeof aberturaDeSerieSchema>,
): Promise<ResultadoDoRecibo> {
  const entrada = aberturaDeSerieSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("recibos", "gerenciar");
  const db = getAdminDb();

  const serie = normalizarSerie(entrada.data.serie);
  const referencia = db.collection(COLECOES.seriesDeRecibo).doc(serie);

  // Reabrir uma série existente com outro número andaria para trás no
  // contador e repetiria recibos já emitidos.
  if ((await referencia.get()).exists) {
    return { ok: false, erro: `A série ${serie} já existe.` };
  }

  const talao = serieDeRecibosSchema.safeParse({
    serie,
    descricao: entrada.data.descricao,
    proximoNumero: entrada.data.proximoNumero,
    ativa: true,
    origem: "portal",
  });

  if (!talao.success) {
    return { ok: false, erro: talao.error.issues[0]?.message };
  }

  await gravarComAuditoria({
    colecao: COLECOES.seriesDeRecibo,
    documentoId: serie,
    antes: null,
    depois: talao.data,
    autor: sessao,
  });

  revalidatePath("/gestao/recibos");

  return { ok: true, id: serie };
}

const encerramentoSchema = z.object({
  serie: z.string().trim().min(1),
  ativa: z.boolean(),
});

export async function alternarSerie(
  dados: z.infer<typeof encerramentoSchema>,
): Promise<ResultadoDoRecibo> {
  const entrada = encerramentoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("recibos", "gerenciar");
  const db = getAdminDb();

  const serie = normalizarSerie(entrada.data.serie);
  const referencia = db.collection(COLECOES.seriesDeRecibo).doc(serie);
  const atual = await referencia.get();

  if (!atual.exists) {
    return { ok: false, erro: `A série ${serie} não existe.` };
  }

  // Encerrar não apaga: os recibos daquela série continuam sendo
  // procurados depois de o talão fechar.
  await gravarComAuditoria({
    colecao: COLECOES.seriesDeRecibo,
    documentoId: serie,
    antes: atual.data() as SerieDeRecibos,
    depois: { ativa: entrada.data.ativa },
    autor: sessao,
  });

  revalidatePath("/gestao/recibos");

  return { ok: true, id: serie };
}

export interface ParcelaEmAberto {
  id: string;
  vencimento: string;
  descricao: string;
  referencia: string;
  servico: TipoDeServico;
  valor: number;
}

/**
 * As parcelas que o recibo pode quitar.
 *
 * Buscadas sob demanda, quando o aluno é escolhido: carregar as de todos os
 * alunos de uma vez mandaria o carnê do colégio inteiro para o navegador de
 * quem vai emitir um recibo só.
 */
export async function listarParcelasEmAberto(
  matricula: string,
): Promise<ParcelaEmAberto[]> {
  await exigirPermissao("recibos", "lancar");

  const resultado = await getAdminDb()
    .collection(COLECOES.cobrancas)
    .where("matricula", "==", matricula)
    .get();

  return resultado.docs
    .map((doc) => ({ id: doc.id, cobranca: doc.data() as Cobranca }))
    .filter(({ cobranca }) => !cobranca.dataPagamento)
    .sort((a, b) => a.cobranca.vencimento.localeCompare(b.cobranca.vencimento))
    .map(({ id, cobranca }) => ({
      id,
      vencimento: cobranca.vencimento,
      descricao: cobranca.tipo
        ? ROTULOS_DE_TIPO_DE_COBRANCA[cobranca.tipo]
        : "Sem descrição",
      referencia: referenciaDaParcela(cobranca),
      servico: servicoDaParcela(cobranca.tipo),
      valor: cobranca.valor ?? 0,
    }));
}
