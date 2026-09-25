"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import {
  chaveDoDestino,
  COLECOES,
  destinoSchema,
  informacaoSchema,
  tipoDeInformacaoSchema,
  type Informacao,
} from "@/core/modelo";

/**
 * Publicação das informações úteis.
 *
 * Quem publica é a secretaria e a coordenação: são materiais
 * institucionais — calendário, proposta pedagógica, critérios de avaliação.
 * Por isso `gerenciar`, e não `lancar`, que liberaria professor e
 * financeiro.
 */

export interface ResultadoDaInformacao {
  ok: boolean;
  erro?: string;
  id?: string;
}

const formularioSchema = z.object({
  id: z.string().optional(),
  tipo: tipoDeInformacaoSchema,
  titulo: z.string().trim().min(3, "Informe um título"),
  descricao: z.string().trim().nullable().default(null),
  conteudo: z.string().trim().min(1, "Escreva o texto da informação"),
  // Campo vazio no formulário é "sem link", não um endereço inválido.
  url: z
    .string()
    .trim()
    .transform((valor) => valor || null)
    .nullable()
    .default(null),
  destino: destinoSchema,
  ordem: z.number().int().default(0),
});

export type FormularioDeInformacao = z.infer<typeof formularioSchema>;

export async function salvarInformacao(
  dados: FormularioDeInformacao,
): Promise<ResultadoDaInformacao> {
  const entrada = formularioSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("avisos", "gerenciar");
  const db = getAdminDb();

  const referencia = entrada.data.id
    ? db.collection(COLECOES.informacoes).doc(entrada.data.id)
    : db.collection(COLECOES.informacoes).doc();

  const atual = await referencia.get();
  const anterior = atual.exists ? (atual.data() as Informacao) : null;

  const informacao = informacaoSchema.safeParse({
    tipo: entrada.data.tipo,
    titulo: entrada.data.titulo,
    descricao: entrada.data.descricao,
    conteudo: entrada.data.conteudo,
    url: entrada.data.url,
    destino: entrada.data.destino,
    chave: chaveDoDestino(entrada.data.destino),
    ordem: entrada.data.ordem,
    // Editar não republica: quem publicou e quando ficam como estavam.
    ativo: anterior?.ativo ?? true,
    publicadoPorUid: anterior?.publicadoPorUid ?? sessao.uid,
    publicadoPorNome: anterior?.publicadoPorNome ?? sessao.nome,
    publicadoEm: anterior?.publicadoEm ?? new Date().toISOString(),
    origem: anterior?.origem ?? "portal",
  });

  if (!informacao.success) {
    return { ok: false, erro: informacao.error.issues[0]?.message };
  }

  await gravarComAuditoria({
    colecao: COLECOES.informacoes,
    documentoId: referencia.id,
    antes: anterior,
    depois: informacao.data,
    autor: sessao,
  });

  revalidar(referencia.id);

  return { ok: true, id: referencia.id };
}

/**
 * Tira ou devolve o card ao ar.
 *
 * Despublicar em vez de apagar: o material some para a família e o registro
 * de que ele existiu permanece — é o mesmo critério dos avisos.
 */
export async function alterarPublicacao(
  id: string,
  ativo: boolean,
): Promise<ResultadoDaInformacao> {
  const sessao = await exigirPermissao("avisos", "gerenciar");

  const referencia = getAdminDb().collection(COLECOES.informacoes).doc(id);
  const atual = await referencia.get();

  if (!atual.exists) return { ok: false, erro: "Informação não encontrada." };

  await gravarComAuditoria({
    colecao: COLECOES.informacoes,
    documentoId: id,
    antes: atual.data() as Informacao,
    depois: { ativo },
    autor: sessao,
  });

  revalidar(id);

  return { ok: true, id };
}

function revalidar(id: string) {
  revalidatePath("/gestao/informacoes");
  revalidatePath(`/gestao/informacoes/${id}`);
  revalidatePath("/portal/informacoes");
}
