"use server";

import { FieldPath } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { corpoDaAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { anoLetivoEscolhido } from "@/core/escola/ano-letivo.server";
import { getAdminDb } from "@/core/firebase/admin";
import {
  alunoSchema,
  COLECOES,
  matriculaSchema,
  type Turma,
} from "@/core/modelo";
import { idDaMatriculaDoAno } from "@/features/alunos/domain/matricula-do-ano";
import {
  formatarMatricula,
  prefixoDoAno,
  proximoSequencial,
  sequencialDaMatricula,
} from "@/features/alunos/domain/nova-matricula";
import { chaveDeComparacao } from "@/features/migracao/domain/texto";

/**
 * Cadastro de um aluno novo.
 *
 * Até aqui o sistema só editava: os 73 alunos vieram da migração do
 * Access, e não havia como criar o 74º. É esta ação que abre o cadastro
 * de verdade.
 *
 * **O número da matrícula é gerado, nunca digitado.** Ele é a chave de
 * meia dúzia de coleções, e deixar alguém escolher é como um aluno novo
 * herda o boletim de um que saiu.
 */

export interface ResultadoDeCriar {
  ok: boolean;
  erro?: string;
  matricula?: string;
}

const entradaSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo"),
  dataNascimento: z.string().trim().optional(),
  cpf: z.string().trim().optional(),
  /** Vazio é legítimo: matrícula feita antes de a turma ser decidida. */
  turmaId: z.string().trim().optional(),
  dataMatricula: z.string().trim().optional(),
});

export type NovoAluno = z.infer<typeof entradaSchema>;

export async function criarAluno(dados: NovoAluno): Promise<ResultadoDeCriar> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const entrada = entradaSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  /**
   * O ano vem do **servidor**, não do formulário.
   *
   * É o ano em que a secretaria está trabalhando, e é ele que entra no
   * número da matrícula. Aceitá-lo do cliente deixaria a tela decidir em
   * que ano um aluno nasce.
   */
  const anoLetivo = await anoLetivoEscolhido();
  const db = getAdminDb();

  const turma = entrada.data.turmaId
    ? await db.collection(COLECOES.turmas).doc(entrada.data.turmaId).get()
    : null;

  if (entrada.data.turmaId && !turma?.exists) {
    return { ok: false, erro: "Turma não encontrada." };
  }

  const dadosDaTurma = turma?.exists ? (turma.data() as Turma) : null;

  if (dadosDaTurma && dadosDaTurma.anoLetivo !== anoLetivo) {
    return {
      ok: false,
      erro: `Esta turma é de ${dadosDaTurma.anoLetivo}, e você está em ${anoLetivo}.`,
    };
  }

  const prefixo = prefixoDoAno(anoLetivo);

  /**
   * A maior matrícula **daquele ano**.
   *
   * Lê só a faixa do ano — algumas dezenas de documentos —, em vez de
   * varrer o cadastro inteiro a cada criação. Matrículas do mesmo ano
   * têm o mesmo tamanho, então a ordem alfabética do id é a numérica, e
   * a última da faixa é a maior.
   *
   * Sem `limitToLast`, que pediria um índice descendente por `__name__`
   * que o Firestore não cria sozinho — e um índice a manter por causa de
   * trinta documentos não se paga.
   */
  const doAno = await db
    .collection(COLECOES.alunos)
    .orderBy(FieldPath.documentId())
    .startAt(prefixo)
    .endAt(`${prefixo}`)
    .get();

  const maiorExistente = doAno.docs.reduce<number | null>((maior, documento) => {
    const sequencial = sequencialDaMatricula(documento.id, anoLetivo);

    return sequencial !== null && sequencial > (maior ?? 0) ? sequencial : maior;
  }, null);

  const contadorRef = db
    .collection(COLECOES.contadores)
    .doc(`matricula-${anoLetivo}`);

  const agora = new Date().toISOString();

  try {
    const matricula = await db.runTransaction(async (transacao) => {
      // Todas as leituras antes de qualquer escrita — exigência do
      // Firestore, e a razão de o contador ser lido aqui dentro.
      const contador = await transacao.get(contadorRef);

      const sequencial = proximoSequencial(
        contador.exists ? (contador.data()?.proximo as number) : null,
        maiorExistente,
      );

      const numero = formatarMatricula(anoLetivo, sequencial);
      const referencia = db.collection(COLECOES.alunos).doc(numero);

      const aluno = alunoSchema.parse({
        matricula: numero,
        nome: entrada.data.nome,
        nomeParaBusca: chaveDeComparacao(entrada.data.nome),
        dataNascimento: entrada.data.dataNascimento || null,
        cpf: entrada.data.cpf?.replace(/\D/g, "") || null,
        ativo: true,
        situacaoMatricula: "ativa",
        dataDaSituacao: entrada.data.dataMatricula || null,
        dataMatricula: entrada.data.dataMatricula || null,
        turmaId: dadosDaTurma ? entrada.data.turmaId : null,
        turmaCodigo: dadosDaTurma?.codigo ?? null,
        segmento: dadosDaTurma?.segmento ?? null,
        serie: null,
        turno: dadosDaTurma?.turno ?? null,
        contato: { emails: [], telefones: [], endereco: {} },
        filiacao: {},
        documentos: {},
        origem: "portal",
        criadoEm: agora,
        criadoPor: sessao.uid,
      });

      /*
        `create`, e não `set`: se por algum motivo o número já estiver
        em uso, a gravação **falha** em vez de escrever por cima de um
        aluno existente. É a última trava, depois do contador e do piso.
      */
      transacao.create(referencia, aluno);

      // O contador não recua quando um aluno é excluído: é isso que faz
      // número usado não voltar.
      transacao.set(contadorRef, { proximo: sequencial + 1 }, { merge: true });

      /*
        O registro de matrícula **do ano**, que é o que faz o boletim e a
        ata daquele ano continuarem certos depois da virada. Só com
        turma: sem ela não há o que registrar.
      */
      if (dadosDaTurma && entrada.data.turmaId) {
        transacao.set(
          db
            .collection(COLECOES.matriculas)
            .doc(idDaMatriculaDoAno(anoLetivo, numero)),
          matriculaSchema.parse({
            matricula: numero,
            nome: entrada.data.nome,
            anoLetivo,
            turmaId: entrada.data.turmaId,
            turmaCodigo: dadosDaTurma.codigo,
            segmento: dadosDaTurma.segmento,
            serie: "",
            turno: dadosDaTurma.turno,
            situacao: "ativa",
            origem: "portal",
          }),
        );
      }

      transacao.set(
        db.collection(COLECOES.auditoria).doc(),
        corpoDaAuditoria({
          colecao: COLECOES.alunos,
          documentoId: numero,
          acao: "criou",
          alteracoes: {
            nome: { de: null, para: entrada.data.nome },
            matricula: { de: null, para: numero },
          },
          autor: sessao,
          em: agora,
        }),
      );

      return numero;
    });

    revalidatePath("/gestao/alunos");

    return { ok: true, matricula };
  } catch (erro) {
    const codigo = (erro as { code?: number }).code;

    // 6 = ALREADY_EXISTS. Acontece se o contador tiver ficado para trás
    // de um jeito que o piso não cobriu — e aí recusar é o certo.
    if (codigo === 6) {
      return {
        ok: false,
        erro: "Esse número de matrícula já existe. Tente de novo.",
      };
    }

    throw erro;
  }
}
