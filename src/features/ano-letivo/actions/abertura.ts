"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { corpoDaAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import {
  alocacaoSchema,
  COLECOES,
  idDaTurma,
  matriculaSchema,
  turmaSchema,
  type Alocacao,
  type Matricula,
  type Turma,
} from "@/core/modelo";
import { idDaMatriculaDoAno } from "@/features/alunos/domain/matricula-do-ano";
import {
  alunosParaPassar,
  turmasParaCriar,
  vinculosParaCriar,
  type AlocacaoComId,
  type TurmaComId,
} from "@/features/ano-letivo/domain/abertura";
import { idDaAlocacao } from "@/features/professores/domain/alocacoes";

/**
 * Abrir o ano letivo seguinte.
 *
 * Duas ações, e não uma, porque os riscos são diferentes: copiar a
 * estrutura é seguro e repetível; passar os alunos move gente de verdade.
 * Ver `domain/abertura.ts`.
 *
 * As duas são **idempotentes**: rodar de novo não duplica nada. É o que
 * permite abrir o ano em etapas, que é como a secretaria trabalha — as
 * turmas em novembro, os vínculos em janeiro, os alunos no dia da
 * virada.
 */

export interface ResultadoDaAbertura {
  ok: boolean;
  erro?: string;
  turmas?: number;
  vinculos?: number;
  alunos?: number;
}

const anosSchema = z.object({
  anoBase: z.coerce.number().int(),
  anoNovo: z.coerce.number().int(),
});

/** Copia turmas e vínculos do ano base para o ano novo. */
export async function copiarEstrutura(
  dados: z.infer<typeof anosSchema>,
): Promise<ResultadoDaAbertura> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const entrada = anosSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const { anoBase, anoNovo } = entrada.data;

  if (anoNovo <= anoBase) {
    return { ok: false, erro: "O ano novo tem de ser posterior ao de base." };
  }

  const db = getAdminDb();

  const [turmasDocs, alocacoesDocs] = await Promise.all([
    db.collection(COLECOES.turmas).get(),
    db.collection(COLECOES.alocacoes).get(),
  ]);

  const turmas = turmasDocs.docs.map(
    (doc) => ({ id: doc.id, ...(doc.data() as Turma) }) as TurmaComId,
  );
  const alocacoes = alocacoesDocs.docs.map(
    (doc) => ({ id: doc.id, ...(doc.data() as Alocacao) }) as AlocacaoComId,
  );

  const novasTurmas = turmasParaCriar(
    turmas.filter((turma) => turma.anoLetivo === anoBase),
    turmas.filter((turma) => turma.anoLetivo === anoNovo),
  );

  const agora = new Date().toISOString();
  const lote = db.batch();

  for (const turma of novasTurmas) {
    const id = idDaTurma(anoNovo, turma.codigo);

    lote.set(
      db.collection(COLECOES.turmas).doc(id),
      turmaSchema.parse({ ...turma, anoLetivo: anoNovo, ativa: true, origem: "portal" }),
    );

    lote.set(
      db.collection(COLECOES.auditoria).doc(),
      corpoDaAuditoria({
        colecao: COLECOES.turmas,
        documentoId: id,
        acao: "criou",
        alteracoes: { anoLetivo: { de: anoBase, para: anoNovo } },
        autor: sessao,
        em: agora,
      }),
    );
  }

  /*
    Os vínculos vão **depois** das turmas no mesmo lote, e apontam para
    turmas que podem ter acabado de ser criadas aqui — por isso o id da
    turma nova é calculado, e não lido do banco.
  */
  const codigoDaTurma = (turmaId: string) =>
    turmas.find((turma) => turma.id === turmaId)?.codigo ?? null;

  const novosVinculos = vinculosParaCriar(
    alocacoes.filter((alocacao) => alocacao.anoLetivo === anoBase),
    alocacoes.filter((alocacao) => alocacao.anoLetivo === anoNovo),
    codigoDaTurma,
  );

  for (const { origem, codigoDaTurma: codigo } of novosVinculos) {
    const turmaId = idDaTurma(anoNovo, codigo);
    const id = idDaAlocacao(anoNovo, origem.professorId, turmaId, origem.disciplinaId);

    lote.set(
      db.collection(COLECOES.alocacoes).doc(id),
      alocacaoSchema.parse({
        ...origem,
        anoLetivo: anoNovo,
        turmaId,
        turmaCodigo: codigo,
        ativa: true,
        origem: "portal",
      }),
    );
  }

  if (novosVinculos.length > 0) {
    lote.set(
      db.collection(COLECOES.auditoria).doc(),
      corpoDaAuditoria({
        colecao: COLECOES.alocacoes,
        documentoId: `abertura-${anoNovo}`,
        acao: "criou",
        alteracoes: {
          vinculos: { de: null, para: novosVinculos.length },
        },
        autor: sessao,
        em: agora,
      }),
    );
  }

  await lote.commit();

  revalidar();

  return { ok: true, turmas: novasTurmas.length, vinculos: novosVinculos.length };
}

const passagemSchema = anosSchema.extend({
  turmaDeOrigem: z.string().min(1),
  turmaDeDestino: z.string().min(1),
  /** Quem vai. A tela manda a lista, para dar para desmarcar um aluno. */
  matriculas: z.array(z.string().min(1)).min(1, "Escolha ao menos um aluno"),
});

/**
 * Passa os alunos de uma turma para o ano novo.
 *
 * **Daqui em diante o aluno pertence à turma nova.** Além do registro de
 * matrícula do ano, o cadastro passa a apontar para ela — é o cadastro
 * que a chamada, o diário e o lançamento de nota enxergam.
 *
 * O que ficou em 2026 continua em 2026: boletim, notas, frequência e a
 * ata daquele ano saem do registro de matrícula de lá.
 */
export async function passarAlunosDeTurma(
  dados: z.infer<typeof passagemSchema>,
): Promise<ResultadoDaAbertura> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const entrada = passagemSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const { anoBase, anoNovo, turmaDeOrigem, turmaDeDestino } = entrada.data;
  const db = getAdminDb();

  const destinoDoc = await db
    .collection(COLECOES.turmas)
    .doc(turmaDeDestino)
    .get();

  if (!destinoDoc.exists) {
    return { ok: false, erro: "Turma de destino não encontrada." };
  }

  const destino = destinoDoc.data() as Turma;

  if (destino.anoLetivo !== anoNovo) {
    return {
      ok: false,
      erro: `A turma de destino é de ${destino.anoLetivo}, e não de ${anoNovo}.`,
    };
  }

  const [doAnoBase, jaNoAnoNovo] = await Promise.all([
    db.collection(COLECOES.matriculas).where("anoLetivo", "==", anoBase).get(),
    db.collection(COLECOES.matriculas).where("anoLetivo", "==", anoNovo).get(),
  ]);

  const candidatos = alunosParaPassar(
    doAnoBase.docs.map((doc) => doc.data() as Matricula),
    jaNoAnoNovo.docs.map((doc) => doc.data() as Matricula),
    turmaDeOrigem,
  ).filter((registro) => entrada.data.matriculas.includes(registro.matricula));

  if (candidatos.length === 0) {
    return { ok: true, alunos: 0 };
  }

  const agora = new Date().toISOString();
  const lote = db.batch();

  for (const registro of candidatos) {
    lote.set(
      db
        .collection(COLECOES.matriculas)
        .doc(idDaMatriculaDoAno(anoNovo, registro.matricula)),
      matriculaSchema.parse({
        matricula: registro.matricula,
        nome: registro.nome,
        anoLetivo: anoNovo,
        turmaId: turmaDeDestino,
        turmaCodigo: destino.codigo,
        segmento: destino.segmento,
        // A série do ano novo é a da turma de destino, e o colégio a
        // preenche no cadastro: aqui ela nasce vazia em vez de repetir a
        // do ano anterior, que seria errada em todo aluno promovido.
        serie: "",
        turno: destino.turno,
        // Matrícula nova, ano novo: ativa e sem data de encerramento. A
        // situação do ano anterior fica no registro de lá.
        situacao: "ativa",
        dataDaSituacao: null,
        origem: "portal",
      }),
    );

    lote.set(
      db.collection(COLECOES.alunos).doc(registro.matricula),
      {
        turmaId: turmaDeDestino,
        turmaCodigo: destino.codigo,
        segmento: destino.segmento,
        turno: destino.turno,
        /*
          A série some junto com a turma, e não fica a do ano anterior.
          O cadastro é o que a **carteirinha** mostra, no app e no
          Portal: mantê-la produziria "EM1A · 3ª série" na portaria, uma
          combinação que não existe. Em branco a carteirinha já sabe se
          virar; errada, ela afirma.
        */
        serie: null,
        atualizadoEm: agora,
        atualizadoPor: sessao.uid,
      },
      { merge: true },
    );
  }

  lote.set(
    db.collection(COLECOES.auditoria).doc(),
    corpoDaAuditoria({
      colecao: COLECOES.matriculas,
      documentoId: `${anoNovo}-${destino.codigo}`,
      acao: "criou",
      alteracoes: {
        turma: { de: turmaDeOrigem, para: turmaDeDestino },
        alunos: { de: null, para: candidatos.length },
      },
      autor: sessao,
      em: agora,
    }),
  );

  await lote.commit();

  revalidar();

  return { ok: true, alunos: candidatos.length };
}

function revalidar() {
  revalidatePath("/gestao/configuracoes/abertura");
  revalidatePath("/gestao/configuracoes/vinculos");
  revalidatePath("/gestao/turmas");
  revalidatePath("/gestao/alunos");
  revalidatePath("/gestao", "layout");
}
