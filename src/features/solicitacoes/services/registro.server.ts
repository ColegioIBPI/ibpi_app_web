import "server-only";

import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { administraEscola, pode } from "@/core/auth/roles";
import type { SessionUser } from "@/core/auth/session";
import { getAdminDb } from "@/core/firebase/admin";
import {
  acompanhanteSchema,
  COLECOES,
  dataSchema,
  faltaAcompanhante,
  origemSchema,
  situacaoDaSolicitacaoSchema,
  solicitacaoDeDocumentacaoSchema,
  solicitacaoDeSaidaAntecipadaSchema,
  type Aluno,
  type DocumentoSolicitavel,
  type Origem,
  type PassoDaSolicitacao,
  type Solicitacao,
} from "@/core/modelo";
import {
  exigeMotivo,
  podeAtender,
  podeMover,
} from "@/features/solicitacoes/domain/fila";

/**
 * A escrita dos pedidos, sem depender de cookie.
 *
 * Mora aqui, e não dentro da Server Action, porque **dois caminhos chegam
 * nela**: o formulário do Portal, que autentica por cookie de sessão, e a
 * rota `/api/solicitacoes`, que o aplicativo MyIBPI chama com um token de
 * ID. Se cada um tivesse a sua cópia, uma das duas acabaria aceitando um
 * pedido que a outra recusa — e a regra de quem pode pedir o quê é
 * exatamente o que não pode divergir.
 *
 * Toda função recebe a sessão já verificada. Nenhuma delas confia em nada
 * que venha do corpo da requisição além dos dados do próprio pedido: o
 * vínculo com o aluno vem sempre da sessão.
 */

export interface ResultadoDaSolicitacao {
  ok: boolean;
  erro?: string;
  id?: string;
}

export const pedidoDeDocumentacaoSchema = z.object({
  matricula: z.string().min(1, "Escolha o aluno."),
  documentoId: z.string().min(1, "Escolha o documento."),
  observacoes: z.string().trim().nullable().default(null),
});

export type PedidoDeDocumentacao = z.infer<typeof pedidoDeDocumentacaoSchema>;

export const pedidoDeSaidaSchema = z.object({
  matricula: z.string().min(1, "Escolha o aluno."),
  data: dataSchema,
  horario: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe o horário como HH:MM."),
  motivo: z.string().trim().min(3, "Informe o motivo da saída."),
  acompanhada: z.boolean(),
  acompanhante: acompanhanteSchema.nullable().default(null),
  observacoes: z.string().trim().nullable().default(null),
});

export type PedidoDeSaida = z.infer<typeof pedidoDeSaidaSchema>;

export const mudancaSchema = z.object({
  id: z.string().min(1),
  situacao: situacaoDaSolicitacaoSchema,
  motivo: z.string().trim().nullable().default(null),
});

export type MudancaDeSituacao = z.infer<typeof mudancaSchema>;

/** Quem não pode lançar não passa daqui, venha de onde vier. */
function podeLancar(sessao: SessionUser): boolean {
  return pode(sessao.role, "solicitacoes", "lancar");
}

export async function registrarPedidoDeDocumentacao(
  sessao: SessionUser,
  dados: PedidoDeDocumentacao,
  origem: Origem = "portal",
): Promise<ResultadoDaSolicitacao> {
  if (!podeLancar(sessao)) {
    return { ok: false, erro: "Seu perfil não abre solicitações." };
  }

  const entrada = pedidoDeDocumentacaoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const vinculo = await conferirVinculo(sessao, entrada.data.matricula);
  if ("erro" in vinculo) return { ok: false, erro: vinculo.erro };

  const documentoDoc = await getAdminDb()
    .collection(COLECOES.documentosSolicitaveis)
    .doc(entrada.data.documentoId)
    .get();

  const documento = documentoDoc.exists
    ? (documentoDoc.data() as DocumentoSolicitavel)
    : null;

  // Fora da lista não se pede: o catálogo pode estar velho na aba que ficou
  // aberta desde ontem, ou na tela do celular que não foi recarregada.
  if (!documento || !documento.ativo) {
    return {
      ok: false,
      erro: "Este documento não está disponível para solicitação.",
    };
  }

  return gravar(
    sessao,
    solicitacaoDeDocumentacaoSchema.safeParse({
      tipo: "documentacao",
      ...dadosComuns(sessao, vinculo.aluno, entrada.data.matricula, origem),
      documentoId: entrada.data.documentoId,
      // Cópia proposital: renomear o item do catálogo não pode reescrever o
      // que a família pediu no mês passado.
      documentoNome: documento.nome,
      observacoes: entrada.data.observacoes,
    }),
  );
}

export async function registrarPedidoDeSaida(
  sessao: SessionUser,
  dados: PedidoDeSaida,
  origem: Origem = "portal",
): Promise<ResultadoDaSolicitacao> {
  if (!podeLancar(sessao)) {
    return { ok: false, erro: "Seu perfil não abre solicitações." };
  }

  const entrada = pedidoDeSaidaSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  // Dizer que alguém vem buscar sem dizer quem deixa a portaria sem saber a
  // quem entregar o aluno.
  if (faltaAcompanhante(entrada.data)) {
    return { ok: false, erro: "Informe quem vem buscar o aluno." };
  }

  const vinculo = await conferirVinculo(sessao, entrada.data.matricula);
  if ("erro" in vinculo) return { ok: false, erro: vinculo.erro };

  return gravar(
    sessao,
    solicitacaoDeSaidaAntecipadaSchema.safeParse({
      tipo: "saida-antecipada",
      ...dadosComuns(sessao, vinculo.aluno, entrada.data.matricula, origem),
      data: entrada.data.data,
      horario: entrada.data.horario,
      motivo: entrada.data.motivo,
      acompanhada: entrada.data.acompanhada,
      // Sem acompanhante, o par de campos fica limpo: guardar um nome de uma
      // escolha desfeita é como ele reaparece numa tela depois.
      acompanhante: entrada.data.acompanhada ? entrada.data.acompanhante : null,
      observacoes: entrada.data.observacoes,
    }),
  );
}

/**
 * Move o pedido na fila.
 *
 * Serve à escola e à família com a mesma função, porque a pergunta "esta
 * pessoa pode levar este pedido daqui para ali" é uma só — e duplicá-la em
 * duas é como as duas telas passam a discordar.
 */
export async function registrarMudancaDeSituacao(
  sessao: SessionUser,
  dados: MudancaDeSituacao,
): Promise<ResultadoDaSolicitacao> {
  if (!podeLancar(sessao)) {
    return { ok: false, erro: "Seu perfil não atende solicitações." };
  }

  const entrada = mudancaSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const referencia = getAdminDb()
    .collection(COLECOES.solicitacoes)
    .doc(entrada.data.id);
  const atual = await referencia.get();

  if (!atual.exists) return { ok: false, erro: "Pedido não encontrado." };

  const solicitacao = atual.data() as Solicitacao;
  const daEscola = administraEscola(sessao.role);

  // Mesma resposta para pedido inexistente e para pedido de outra família.
  if (!daEscola && !sessao.alunosVinculados.includes(solicitacao.matricula)) {
    return { ok: false, erro: "Pedido não encontrado." };
  }

  // Quem não atende este tipo não o move — e recebe a mesma resposta de um
  // pedido inexistente, para a negativa não revelar que ele existe.
  if (daEscola && !podeAtender(sessao.role, solicitacao.tipo)) {
    return { ok: false, erro: "Pedido não encontrado." };
  }

  const quem = daEscola ? "escola" : "familia";

  if (
    !podeMover(
      solicitacao.tipo,
      solicitacao.situacao,
      entrada.data.situacao,
      quem,
    )
  ) {
    return {
      ok: false,
      erro: `Um pedido ${solicitacao.situacao} não pode passar para ${entrada.data.situacao}.`,
    };
  }

  if (exigeMotivo(entrada.data.situacao) && !entrada.data.motivo) {
    return {
      ok: false,
      erro: "Escreva o motivo da recusa — a família vai ler.",
    };
  }

  const passo: PassoDaSolicitacao = {
    situacao: entrada.data.situacao,
    em: new Date().toISOString(),
    porUid: sessao.uid,
    porNome: sessao.nome,
    motivo: entrada.data.motivo,
  };

  await gravarComAuditoria({
    colecao: COLECOES.solicitacoes,
    documentoId: entrada.data.id,
    antes: solicitacao,
    depois: {
      situacao: entrada.data.situacao,
      historico: [...(solicitacao.historico ?? []), passo],
    },
    autor: sessao,
  });

  return { ok: true, id: entrada.data.id };
}

/**
 * O vínculo vem da sessão, nunca do corpo da requisição.
 *
 * Sem isto bastaria trocar a matrícula no JSON para pedir o histórico de
 * outro aluno — e é justamente esta a porta que o aplicativo abre, porque
 * lá o corpo da requisição é montado por um cliente que não controlamos.
 */
async function conferirVinculo(
  sessao: SessionUser,
  matricula: string,
): Promise<{ aluno: Aluno } | { erro: string }> {
  if (!sessao.alunosVinculados.includes(matricula)) {
    return { erro: "Aluno não encontrado." };
  }

  const doc = await getAdminDb()
    .collection(COLECOES.alunos)
    .doc(matricula)
    .get();

  if (!doc.exists) return { erro: "Aluno não encontrado." };

  return { aluno: doc.data() as Aluno };
}

function dadosComuns(
  sessao: SessionUser,
  aluno: Aluno,
  matricula: string,
  origem: Origem,
) {
  const agora = new Date().toISOString();

  return {
    matricula,
    alunoNome: aluno.nome,
    turmaCodigo: aluno.turmaCodigo ?? null,
    solicitanteUid: sessao.uid,
    solicitanteNome: sessao.nome,
    situacao: "aberta" as const,
    historico: [
      {
        situacao: "aberta" as const,
        em: agora,
        porUid: sessao.uid,
        porNome: sessao.nome,
      },
    ],
    abertaEm: agora,
    origem: origemSchema.parse(origem),
  };
}

/** Zod 4 não exporta mais `SafeParseReturnType`; a forma é esta. */
type Validacao =
  { success: true; data: Solicitacao } | { success: false; error: z.ZodError };

async function gravar(
  sessao: SessionUser,
  validacao: Validacao,
): Promise<ResultadoDaSolicitacao> {
  if (!validacao.success) {
    return { ok: false, erro: validacao.error.issues[0]?.message };
  }

  const referencia = getAdminDb().collection(COLECOES.solicitacoes).doc();

  await gravarComAuditoria({
    colecao: COLECOES.solicitacoes,
    documentoId: referencia.id,
    antes: null,
    depois: validacao.data,
    autor: sessao,
  });

  return { ok: true, id: referencia.id };
}
