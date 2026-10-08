import { NextResponse } from "next/server";
import { z } from "zod";

import { sessaoDoBearer } from "@/core/auth/bearer";
import { situacaoDaSolicitacaoSchema } from "@/core/modelo";
import { registrarMudancaDeSituacao } from "@/features/solicitacoes/services/registro.server";

/**
 * Mudança de situação pelo aplicativo.
 *
 * Na prática, hoje, é o cancelamento: a família só move o pedido para
 * `cancelada`, e só enquanto ninguém o pegou. A rota não limita isso por
 * conta própria — quem decide é `domain/fila`, a mesma função que o Portal
 * consulta. Uma lista de situações permitidas escrita aqui seria uma
 * segunda regra, e a segunda regra é a que fica para trás.
 *
 * ```
 * PATCH /api/solicitacoes/{id}
 * Authorization: Bearer <idToken>
 * { "situacao": "cancelada" }
 * ```
 */

const corpoSchema = z.object({
  situacao: situacaoDaSolicitacaoSchema,
  motivo: z.string().trim().nullable().default(null),
});

export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/solicitacoes/[id]">,
) {
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

  const { id } = await params;
  const resultado = await registrarMudancaDeSituacao(sessao, {
    id,
    ...corpo.data,
  });

  if (!resultado.ok) {
    // "Pedido não encontrado" cobre tanto o que não existe quanto o de
    // outra família: 404 nos dois casos, para a negativa não revelar que
    // ele existe.
    const inexistente = resultado.erro?.includes("não encontrado");

    return NextResponse.json(
      { erro: resultado.erro },
      { status: inexistente ? 404 : 422 },
    );
  }

  return NextResponse.json({ id: resultado.id });
}
