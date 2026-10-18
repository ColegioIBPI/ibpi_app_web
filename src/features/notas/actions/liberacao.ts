"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  calcularAlteracoes,
  semCamposTecnicos,
} from "@/core/auditoria/diferencas";
import { corpoDaAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type Boletim } from "@/core/modelo";
import { marcarLiberacao, TRIMESTRES } from "@/features/notas/domain/liberacao";
import { idDoBoletim } from "@/features/notas/services/notas.server";

/**
 * Liberação do boletim de um aluno, trimestre a trimestre.
 *
 * Quem libera é quem fecha o boletim: secretaria, coordenação e
 * administração — `notas: gerenciar`. O professor lança nota, mas não
 * decide o dia em que a família vê.
 */

export interface ResultadoDaLiberacao {
  ok: boolean;
  erro?: string;
}

const liberacaoSchema = z.object({
  anoLetivo: z.number().int(),
  matricula: z.string().min(1),
  trimestre: z.enum(TRIMESTRES),
  liberar: z.boolean(),
});

export async function liberarTrimestre(
  dados: z.infer<typeof liberacaoSchema>,
): Promise<ResultadoDaLiberacao> {
  const entrada = liberacaoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("notas", "gerenciar");
  const db = getAdminDb();
  const agora = new Date().toISOString();

  const { anoLetivo, matricula, trimestre, liberar } = entrada.data;
  const documentoId = idDoBoletim(anoLetivo, matricula);
  const referencia = db.collection(COLECOES.boletins).doc(documentoId);

  const atual = await referencia.get();
  const anterior = atual.exists ? (atual.data() as Boletim) : null;

  /**
   * As notas do trimestre, para marcar o lado denormalizado.
   *
   * Lidas aqui e escritas no **mesmo lote** do boletim: se o registro do
   * ato entrasse sem as notas, a secretaria veria "liberado" e a família
   * continuaria sem ver nada — e ninguém saberia por quê.
   */
  const notas = await db
    .collection(COLECOES.notas)
    .where("matricula", "==", matricula)
    .where("anoLetivo", "==", anoLetivo)
    .where("trimestre", "==", Number(trimestre))
    .get();

  // O lote do Firestore aceita 500 operações. Um aluno tem uma nota por
  // disciplina — nem perto do limite —, mas a conferência evita que um
  // caso estranho falhe em silêncio no meio da gravação.
  if (notas.size > 480) {
    return {
      ok: false,
      erro: "Este trimestre tem notas demais para liberar de uma vez.",
    };
  }

  const liberacoes = marcarLiberacao(
    anterior?.liberacoes,
    trimestre,
    liberar,
    sessao.nome,
    agora,
  );

  const lote = db.batch();

  /**
   * O mapa é escrito **por caminho de campo**, e não inteiro.
   *
   * `set(..., { merge: true })` faz merge **profundo** de mapa: gravar
   * `liberacoes` sem a chave do trimestre recolhido não a apaga, ela
   * simplesmente continua lá. Uma verificação contra o banco real pegou
   * exatamente isso — a secretaria desmarcava a caixa, as notas eram
   * desmarcadas, e o registro seguia dizendo "liberado".
   *
   * O caminho de campo resolve e traz um ganho de brinde: duas pessoas
   * liberando trimestres diferentes do mesmo aluno ao mesmo tempo não se
   * sobrescrevem, como aconteceria ao regravar o mapa inteiro.
   */
  lote.set(
    referencia,
    {
      anoLetivo,
      matricula,
      atualizadoEm: agora,
      atualizadoPor: sessao.uid,
    },
    { merge: true },
  );

  lote.update(referencia, {
    [`liberacoes.${trimestre}`]: liberar
      ? { em: agora, porNome: sessao.nome }
      : FieldValue.delete(),
  });

  for (const nota of notas.docs) {
    lote.update(nota.ref, {
      liberado: liberar,
      atualizadoEm: agora,
      atualizadoPor: sessao.uid,
    });
  }

  lote.set(
    db.collection(COLECOES.auditoria).doc(),
    corpoDaAuditoria({
      colecao: COLECOES.boletins,
      documentoId,
      acao: anterior ? "alterou" : "criou",
      alteracoes: semCamposTecnicos(
        calcularAlteracoes(
          { liberacoes: anterior?.liberacoes ?? {} },
          { liberacoes },
        ),
      ),
      autor: sessao,
      em: agora,
    }),
  );

  await lote.commit();

  revalidatePath("/gestao/boletins");
  revalidatePath(`/gestao/boletins/${matricula}`);
  revalidatePath("/portal/boletim");

  return { ok: true };
}

const turmaSchema = z.object({
  anoLetivo: z.number().int(),
  matriculas: z.array(z.string().min(1)).min(1, "Nenhum aluno selecionado"),
  trimestre: z.enum(TRIMESTRES),
  liberar: z.boolean(),
});

/**
 * Libera a turma inteira de uma vez.
 *
 * O trimestre fecha para todo mundo no mesmo dia, e marcar trinta caixas à
 * mão é como três alunos ficam de fora sem ninguém notar.
 *
 * Aluno por aluno, e não num lote só: cada um é uma decisão auditada, e um
 * erro em um não pode derrubar a liberação dos outros vinte e nove. O
 * resultado diz quantos falharam.
 */
export async function liberarTurma(
  dados: z.infer<typeof turmaSchema>,
): Promise<ResultadoDaLiberacao & { falharam?: number }> {
  const entrada = turmaSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  await exigirPermissao("notas", "gerenciar");

  let falharam = 0;

  for (const matricula of entrada.data.matriculas) {
    const resultado = await liberarTrimestre({
      anoLetivo: entrada.data.anoLetivo,
      matricula,
      trimestre: entrada.data.trimestre,
      liberar: entrada.data.liberar,
    });

    if (!resultado.ok) falharam += 1;
  }

  return falharam === 0
    ? { ok: true }
    : {
        ok: false,
        falharam,
        erro: `${falharam} aluno(s) não puderam ser liberados. Os demais foram.`,
      };
}
