import { NextResponse } from "next/server";
import { z } from "zod";

import { sessaoDoBearer } from "@/core/auth/bearer";
import {
  pedidoDeDocumentacaoSchema,
  pedidoDeSaidaSchema,
  pedidoDeSegundaChamadaSchema,
  registrarPedidoDeDocumentacao,
  registrarPedidoDeSaida,
  registrarPedidoDeSegundaChamada,
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
 *
 * A 2ª chamada leva arquivo, então vai em `multipart/form-data`: um campo
 * `comprovante` com o arquivo e um campo `dados` com o mesmo JSON. Misturar
 * as duas formas na mesma rota evita ao aplicativo descobrir um segundo
 * endereço — o que ele manda muda, para onde ele manda não.
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

  const tipoDoConteudo = request.headers.get("content-type") ?? "";

  if (tipoDoConteudo.includes("multipart/form-data")) {
    return comArquivo(request, sessao);
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

/**
 * 2ª chamada — o único pedido que leva arquivo.
 *
 * `dados` chega como JSON dentro do formulário, e não espalhado em campos
 * de texto: o schema é o mesmo do resto, e converter número e nulo a partir
 * de `FormData` seria uma segunda forma de validar os mesmos dados.
 */
async function comArquivo(
  request: Request,
  sessao: Awaited<ReturnType<typeof sessaoDoBearer>>,
) {
  if (!sessao) {
    return NextResponse.json({ erro: "Sessão inválida." }, { status: 401 });
  }

  const formulario = await request.formData().catch(() => null);
  const arquivo = formulario?.get("comprovante");

  if (!formulario || !(arquivo instanceof File)) {
    return NextResponse.json(
      { erro: "Envie o comprovante no campo `comprovante`." },
      { status: 400 },
    );
  }

  // `JSON.parse` de um campo malformado lançaria, e a rota responderia 500
  // onde o certo é 400: o erro é do que foi mandado, não do servidor.
  let bruto: unknown = null;
  try {
    bruto = JSON.parse(String(formulario.get("dados") ?? "null"));
  } catch {
    return NextResponse.json(
      { erro: "O campo `dados` não é um JSON válido." },
      { status: 400 },
    );
  }

  const dados = pedidoDeSegundaChamadaSchema.safeParse(bruto);

  if (!dados.success) {
    return NextResponse.json(
      { erro: dados.error.issues[0]?.message ?? "Requisição inválida." },
      { status: 400 },
    );
  }

  const resultado = await registrarPedidoDeSegundaChamada(
    sessao,
    dados.data,
    arquivo,
    "app",
  );

  return resultado.ok
    ? NextResponse.json({ id: resultado.id }, { status: 201 })
    : NextResponse.json({ erro: resultado.erro }, { status: 422 });
}
