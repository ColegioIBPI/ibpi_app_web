import { NextResponse } from "next/server";
import { z } from "zod";

import { sessaoDoBearer } from "@/core/auth/bearer";
import {
  pedidoDeDocumentacaoSchema,
  pedidoDeSaidaSchema,
  registrarPedidoDeDocumentacao,
  registrarPedidoDeSaida,
} from "@/features/solicitacoes/services/registro.server";

/**
 * Abertura de pedido pelo aplicativo MyIBPI.
 *
 * O app **não grava no Firestore**: a regra nega toda escrita de cliente, e
 * é o que impede alguém de abrir um pedido em nome de outra família
 * trocando a matrícula. Ele chama esta rota com o token de ID que já tem do
 * login, e o servidor confere o vínculo antes de gravar.
 *
 * A regra de quem pode pedir o quê é a mesma do Portal, de propósito:
 * ambos chamam `features/solicitacoes/services/registro.server`.
 *
 * ```
 * POST /api/solicitacoes
 * Authorization: Bearer <idToken>
 * { "tipo": "documentacao", "matricula": "26029", "documentoId": "...",
 *   "observacoes": null }
 * ```
 */

const corpoSchema = z.discriminatedUnion("tipo", [
  pedidoDeDocumentacaoSchema.extend({ tipo: z.literal("documentacao") }),
  pedidoDeSaidaSchema.extend({ tipo: z.literal("saida-antecipada") }),
]);

export async function POST(request: Request) {
  const sessao = await sessaoDoBearer(request);

  if (!sessao) {
    return NextResponse.json(
      { erro: "Sessão inválida ou expirada." },
      { status: 401 },
    );
  }

  const corpo = corpoSchema.safeParse(await request.json().catch(() => null));

  if (!corpo.success) {
    return NextResponse.json(
      { erro: corpo.error.issues[0]?.message ?? "Requisição inválida." },
      { status: 400 },
    );
  }

  const resultado =
    corpo.data.tipo === "documentacao"
      ? await registrarPedidoDeDocumentacao(sessao, corpo.data, "app")
      : await registrarPedidoDeSaida(sessao, corpo.data, "app");

  if (!resultado.ok) {
    // 422: a requisição está bem formada, mas a regra de negócio recusou —
    // documento fora da lista, aluno sem vínculo, acompanhante faltando. É
    // diferente de 400, que é JSON malformado, e o app trata diferente:
    // aqui a mensagem é para mostrar à família.
    return NextResponse.json({ erro: resultado.erro }, { status: 422 });
  }

  return NextResponse.json({ id: resultado.id }, { status: 201 });
}
