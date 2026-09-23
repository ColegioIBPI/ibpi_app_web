"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  calcularAlteracoes,
  semCamposTecnicos,
} from "@/core/auditoria/diferencas";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import {
  COLECOES,
  dataSchema,
  frequenciaDiariaSchema,
  ocorrenciaSchema,
  situacaoDePresencaSchema,
  tipoDeOcorrenciaSchema,
  type FrequenciaDiaria,
} from "@/core/modelo";
import { idDoLancamento } from "@/features/frequencia/domain/chamada";

/**
 * Gravação da chamada do dia.
 *
 * Grava em lote, com a auditoria de cada linha no mesmo lote: a chamada é
 * corrigida o tempo todo (quem chegou atrasado, quem trouxe atestado), e
 * "quem mudou a falta do meu filho" é exatamente o tipo de pergunta que o
 * colégio precisa saber responder.
 */

export interface ResultadoDaChamada {
  ok: boolean;
  erro?: string;
  gravados?: number;
}

const linhaSchema = z.object({
  matricula: z.string().min(1),
  nome: z.string().optional(),
  situacao: situacaoDePresencaSchema,
  ocorrencia: tipoDeOcorrenciaSchema.nullable(),
  observacao: z.string(),
});

const entradaSchema = z.object({
  turmaId: z.string().min(1),
  turmaCodigo: z.string().min(1),
  data: dataSchema,
  linhas: z.array(linhaSchema),
});

export type EntradaDaChamada = z.infer<typeof entradaSchema>;

export async function salvarChamada(
  dados: EntradaDaChamada,
): Promise<ResultadoDaChamada> {
  const sessao = await exigirPermissao("frequencia", "lancar");

  const entrada = entradaSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const { turmaId, turmaCodigo, data, linhas } = entrada.data;
  if (linhas.length === 0) return { ok: true, gravados: 0 };

  // Chamada de data futura é quase sempre engano de digitação, e um registro
  // de falta com data errada some da vista de todo mundo.
  if (data > new Date().toISOString().slice(0, 10)) {
    return { ok: false, erro: "Não dá para lançar chamada de um dia futuro." };
  }

  const db = getAdminDb();
  const agora = new Date().toISOString();

  const referencias = linhas.map((linha) =>
    db
      .collection(COLECOES.frequenciaDiaria)
      .doc(idDoLancamento(data, linha.matricula)),
  );

  const anteriores = await db.getAll(...referencias);
  const lote = db.batch();
  let gravados = 0;

  for (const [indice, linha] of linhas.entries()) {
    const registro = frequenciaDiariaSchema.safeParse({
      data,
      matricula: linha.matricula,
      nome: linha.nome,
      turmaId,
      turmaCodigo,
      situacao: linha.situacao,
      ocorrencia: linha.ocorrencia,
      observacao: linha.observacao,
      origem: "portal",
    });

    if (!registro.success) {
      return { ok: false, erro: registro.error.issues[0]?.message };
    }

    const anterior = anteriores[indice].data() as FrequenciaDiaria | undefined;
    const alteracoes = semCamposTecnicos(
      calcularAlteracoes(anterior ?? {}, registro.data),
    );

    if (Object.keys(alteracoes).length === 0) continue;

    lote.set(
      referencias[indice],
      { ...registro.data, atualizadoEm: agora, atualizadoPor: sessao.uid },
      { merge: true },
    );

    lote.set(db.collection(COLECOES.auditoria).doc(), {
      colecao: COLECOES.frequenciaDiaria,
      documentoId: referencias[indice].id,
      acao: anterior ? "alterou" : "criou",
      alteracoes,
      autorUid: sessao.uid,
      autorNome: sessao.nome,
      autorPerfil: sessao.role,
      em: agora,
    });

    // Ocorrência marcada na chamada também vira registro próprio: é por ele
    // que a coordenação e o responsável enxergam o histórico, sem ter de
    // varrer a frequência dia a dia.
    if (linha.ocorrencia) {
      const ocorrencia = ocorrenciaSchema.safeParse({
        data,
        matricula: linha.matricula,
        nome: linha.nome,
        turmaId,
        turmaCodigo,
        tipo: linha.ocorrencia,
        descricao: linha.observacao.trim() || rotuloPadrao(linha.ocorrencia),
        registradoPor: sessao.uid,
        origem: "portal",
      });

      if (ocorrencia.success) {
        lote.set(
          db
            .collection(COLECOES.ocorrencias)
            .doc(
              `${idDoLancamento(data, linha.matricula)}-${linha.ocorrencia}`,
            ),
          {
            ...ocorrencia.data,
            atualizadoEm: agora,
            atualizadoPor: sessao.uid,
          },
          { merge: true },
        );
      }
    }

    gravados += 1;
  }

  if (gravados === 0) return { ok: true, gravados: 0 };

  await lote.commit();

  revalidatePath("/gestao/frequencia");
  revalidatePath("/gestao/ocorrencias");
  revalidatePath("/portal/frequencia");

  return { ok: true, gravados };
}

function rotuloPadrao(tipo: string): string {
  return `Registrado na chamada: ${tipo.replace(/-/g, " ")}`;
}
