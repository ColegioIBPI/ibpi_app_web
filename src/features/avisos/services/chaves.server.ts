import "server-only";

import { COLECOES, type Aluno, type Segmento } from "@/core/modelo";
import type { Role } from "@/core/auth/roles";
import { getAdminDb } from "@/core/firebase/admin";
import { chavesDoDestinatario } from "@/features/avisos/domain/destinatarios";

/**
 * As chaves de aviso que alcançam cada pessoa, gravadas em `users/{uid}`.
 *
 * Existem para o **app MyIBPI**, que lê o Firestore direto e depende das
 * Security Rules. A regra precisa decidir se um aviso alcança quem pede, e
 * regra do Firestore não percorre lista: não dá para, a partir de
 * `alunosVinculados`, montar `turma:<a de cada filho>`.
 *
 * Guardar a **lista pronta** resolve isso e tem uma vantagem maior: a regra
 * e o servidor passam a dizer a mesma coisa, porque as duas saem de
 * `chavesDoDestinatario`. Recalcular a regra em outra linguagem é como as
 * duas versões divergem — e aqui divergir significa aviso de uma família
 * aparecendo para outra.
 *
 * O preço é manter a lista em dia. Ela é refeita quando a conta é criada,
 * quando um vínculo muda e quando o aluno troca de turma.
 */

/** O que basta para calcular as chaves, venha da sessão ou de `users`. */
export interface PessoaComAvisos {
  uid: string;
  role: Role;
  matricula?: string | null;
  alunosVinculados?: string[];
}

/**
 * Recalcula e grava as chaves de uma conta.
 *
 * Só aluno e responsável têm chaves: a equipe escolar lê todos os avisos, e
 * gravar uma lista para ela seria um dado a manter sem servir para nada.
 */
export async function sincronizarChavesDeAviso(
  pessoa: PessoaComAvisos,
): Promise<string[]> {
  const db = getAdminDb();

  if (pessoa.role !== "aluno" && pessoa.role !== "responsavel") return [];

  const matriculas =
    pessoa.role === "aluno"
      ? pessoa.matricula
        ? [pessoa.matricula]
        : []
      : (pessoa.alunosVinculados ?? []);

  const turmas = new Set<string>();
  const segmentos = new Set<Segmento>();

  // Turma e segmento vêm do cadastro dos alunos que a pessoa acompanha — o
  // aviso da turma precisa alcançar a família sem ela saber o id da turma.
  const docs = await Promise.all(
    matriculas.map((matricula) =>
      db.collection(COLECOES.alunos).doc(matricula).get(),
    ),
  );

  for (const doc of docs) {
    const aluno = doc.data() as Aluno | undefined;
    if (aluno?.turmaId) turmas.add(aluno.turmaId);
    if (aluno?.segmento) segmentos.add(aluno.segmento);
  }

  const chaves = chavesDoDestinatario({
    role: pessoa.role,
    matricula: pessoa.matricula,
    alunosVinculados: pessoa.alunosVinculados,
    responsavelId: await idDoResponsavel(pessoa),
    turmas: [...turmas],
    segmentos: [...segmentos],
  });

  await db
    .collection(COLECOES.users)
    .doc(pessoa.uid)
    .set({ chavesDeAviso: chaves }, { merge: true });

  return chaves;
}

/** Recalcula pela conta, lendo o perfil e os vínculos de `users`. */
export async function sincronizarChavesPorUid(uid: string): Promise<string[]> {
  const doc = await getAdminDb().collection(COLECOES.users).doc(uid).get();
  const dados = doc.data();

  if (!dados?.role) return [];

  return sincronizarChavesDeAviso({
    uid,
    role: dados.role as Role,
    matricula: (dados.matricula as string) ?? null,
    alunosVinculados: (dados.alunosVinculados as string[]) ?? [],
  });
}

/**
 * Refaz as chaves de todo mundo que acompanha um aluno.
 *
 * Chamada quando o aluno muda de turma: as chaves dele e as dos
 * responsáveis dele passam a apontar para a turma errada, e o aviso da
 * turma nova não chegaria — em silêncio, que é o pior jeito de falhar.
 */
export async function sincronizarChavesDoAluno(
  matricula: string,
): Promise<number> {
  const db = getAdminDb();

  const contas = await db
    .collection(COLECOES.users)
    .where("role", "in", ["aluno", "responsavel"])
    .get();

  const afetadas = contas.docs.filter((doc) => {
    const dados = doc.data();

    return (
      dados.matricula === matricula ||
      (Array.isArray(dados.alunosVinculados) &&
        dados.alunosVinculados.includes(matricula))
    );
  });

  await Promise.all(afetadas.map((doc) => sincronizarChavesPorUid(doc.id)));

  return afetadas.length;
}

/** Id do cadastro em `responsaveis`, que vira a chave `responsavel:{id}`. */
async function idDoResponsavel(
  pessoa: PessoaComAvisos,
): Promise<string | null> {
  if (pessoa.role !== "responsavel") return null;

  const docs = await getAdminDb()
    .collection(COLECOES.responsaveis)
    .where("uid", "==", pessoa.uid)
    .limit(1)
    .get();

  return docs.empty ? null : docs.docs[0].id;
}
