"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { corpoDaAuditoria, gravarComAuditoria } from "@/core/auditoria/registrar";
import { calcularAlteracoes, semCamposTecnicos } from "@/core/auditoria/diferencas";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import {
  COLECOES,
  itemDoReciboSchema,
  reciboSchema,
  serieDeRecibosSchema,
  type Recibo,
  type SerieDeRecibos,
} from "@/core/modelo";
import { obterAlunoVisivel } from "@/features/alunos/services/alunos.server";
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
      const serieDoc = await transacao.get(serieRef);

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

  revalidatePath("/gestao/recibos");
  revalidatePath(`/gestao/recibos/${entrada.data.id}`);

  return { ok: true, id: entrada.data.id };
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
