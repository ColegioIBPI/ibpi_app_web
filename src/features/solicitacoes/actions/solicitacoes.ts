"use server";

import { revalidatePath } from "next/cache";

import { exigirPermissao } from "@/core/auth/guards";
import {
  pedidoDeSegundaChamadaSchema,
  registrarMudancaDeSituacao,
  registrarPedidoDeDocumentacao,
  registrarPedidoDeSaida,
  registrarPedidoDeSegundaChamada,
  type MudancaDeSituacao,
  type PedidoDeDocumentacao,
  type PedidoDeSaida,
  type ResultadoDaSolicitacao,
} from "@/features/solicitacoes/services/registro.server";

/**
 * As ações do Portal.
 *
 * São invólucros finos: autenticam pelo cookie, chamam a mesma função que a
 * rota `/api/solicitacoes` usa para o aplicativo, e revalidam as telas. A
 * regra de quem pode pedir o quê vive em
 * `services/registro.server.ts` — um lugar só, porque é exatamente a regra
 * que não pode divergir entre os dois caminhos.
 */

export type {
  MudancaDeSituacao,
  PedidoDeDocumentacao,
  PedidoDeSaida,
  ResultadoDaSolicitacao,
};

export async function abrirPedidoDeDocumentacao(
  dados: PedidoDeDocumentacao,
): Promise<ResultadoDaSolicitacao> {
  const sessao = await exigirPermissao("solicitacoes", "lancar");
  const resultado = await registrarPedidoDeDocumentacao(
    sessao,
    dados,
    "portal",
  );

  if (resultado.ok) revalidar(resultado.id);

  return resultado;
}

export async function abrirPedidoDeSaida(
  dados: PedidoDeSaida,
): Promise<ResultadoDaSolicitacao> {
  const sessao = await exigirPermissao("solicitacoes", "lancar");
  const resultado = await registrarPedidoDeSaida(sessao, dados, "portal");

  if (resultado.ok) revalidar(resultado.id);

  return resultado;
}

/**
 * 2ª chamada — recebe `FormData` porque leva arquivo.
 *
 * Server Action com arquivo não aceita objeto comum: o `File` precisa
 * atravessar como parte de um formulário.
 */
export async function abrirPedidoDeSegundaChamada(
  formulario: FormData,
): Promise<ResultadoDaSolicitacao> {
  const sessao = await exigirPermissao("solicitacoes", "lancar");

  const arquivo = formulario.get("comprovante");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: "Anexe o comprovante de pagamento." };
  }

  const dados = pedidoDeSegundaChamadaSchema.safeParse({
    matricula: formulario.get("matricula"),
    disciplinaId: formulario.get("disciplinaId"),
    dataDaAvaliacao: formulario.get("dataDaAvaliacao") || null,
    observacoes: formulario.get("observacoes") || null,
  });

  if (!dados.success) {
    return { ok: false, erro: dados.error.issues[0]?.message };
  }

  const resultado = await registrarPedidoDeSegundaChamada(
    sessao,
    dados.data,
    arquivo,
    "portal",
  );

  if (resultado.ok) revalidar(resultado.id);

  return resultado;
}

export async function mudarSituacao(
  dados: MudancaDeSituacao,
): Promise<ResultadoDaSolicitacao> {
  const sessao = await exigirPermissao("solicitacoes", "lancar");
  const resultado = await registrarMudancaDeSituacao(sessao, dados);

  if (resultado.ok) revalidar(resultado.id);

  return resultado;
}

function revalidar(id?: string) {
  revalidatePath("/gestao/solicitacoes");
  revalidatePath("/portal/solicitacoes");
  if (id) revalidatePath(`/gestao/solicitacoes/${id}`);
}
