import "server-only";

import { COLECOES, type Aviso, type Segmento } from "@/core/modelo";
import { isEquipe } from "@/core/auth/roles";
import type { SessionUser } from "@/core/auth/session";
import { getAdminDb, getAdminStorage } from "@/core/firebase/admin";
import {
  avisoEhPara,
  chavesDoDestinatario,
  lotesDeChaves,
  type ContextoDoDestinatario,
} from "@/features/avisos/domain/destinatarios";

/**
 * Leitura de avisos.
 *
 * A equipe escolar vê o que foi publicado; a família vê o que é para ela. O
 * recorte é aplicado aqui porque o Admin SDK ignora as Security Rules — e
 * aviso individual, se vazar, entrega o assunto de outra família.
 */

export interface AvisoComId extends Aviso {
  id: string;
}

/** Monta o contexto do destinatário a partir da sessão. */
export async function contextoDaSessao(
  sessao: SessionUser,
): Promise<ContextoDoDestinatario> {
  const db = getAdminDb();

  const matriculas =
    sessao.role === "aluno"
      ? sessao.matricula
        ? [sessao.matricula]
        : []
      : sessao.alunosVinculados;

  const turmas = new Set<string>();
  const segmentos = new Set<Segmento>();

  // Turma e segmento vêm do cadastro dos alunos que a pessoa acompanha — o
  // aviso da turma precisa alcançar a família sem ela ter de saber o id.
  if (matriculas.length > 0) {
    const docs = await Promise.all(
      matriculas.map((matricula) =>
        db.collection(COLECOES.alunos).doc(matricula).get(),
      ),
    );

    for (const doc of docs) {
      const dados = doc.data();
      if (typeof dados?.turmaId === "string") turmas.add(dados.turmaId);
      if (typeof dados?.segmento === "string") {
        segmentos.add(dados.segmento as Segmento);
      }
    }
  }

  if (sessao.role === "professor") {
    const doc = await db.collection(COLECOES.users).doc(sessao.uid).get();
    for (const turma of (doc.data()?.turmas as string[]) ?? [])
      turmas.add(turma);
  }

  return {
    role: sessao.role,
    matricula: sessao.matricula,
    alunosVinculados: sessao.alunosVinculados,
    responsavelId: await idDoResponsavel(sessao),
    turmas: [...turmas],
    segmentos: [...segmentos],
  };
}

async function idDoResponsavel(sessao: SessionUser): Promise<string | null> {
  if (sessao.role !== "responsavel") return null;

  const docs = await getAdminDb()
    .collection(COLECOES.responsaveis)
    .where("uid", "==", sessao.uid)
    .limit(1)
    .get();

  return docs.empty ? null : docs.docs[0].id;
}

/** Avisos que alcançam a pessoa, do mais recente para o mais antigo. */
export async function listarAvisosPara(
  sessao: SessionUser,
): Promise<AvisoComId[]> {
  const contexto = await contextoDaSessao(sessao);
  const db = getAdminDb();

  const consultas = lotesDeChaves(chavesDoDestinatario(contexto)).map((lote) =>
    db
      .collection(COLECOES.avisos)
      .where("ativo", "==", true)
      .where("chave", "in", lote)
      .get(),
  );

  const resultados = await Promise.all(consultas);

  const avisos = new Map<string, AvisoComId>();
  for (const resultado of resultados) {
    for (const doc of resultado.docs) {
      avisos.set(doc.id, { id: doc.id, ...(doc.data() as Aviso) });
    }
  }

  return ordenar([...avisos.values()]);
}

/** Tudo que foi publicado — visão da equipe escolar. */
export async function listarAvisosPublicados(): Promise<AvisoComId[]> {
  const docs = await getAdminDb().collection(COLECOES.avisos).get();

  return ordenar(
    docs.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Aviso) })),
  );
}

/**
 * Um aviso, se a pessoa tiver direito a ele.
 *
 * A equipe escolar lê qualquer aviso — inclusive os despublicados, porque
 * precisa saber o que já foi comunicado.
 */
export async function obterAvisoVisivel(
  sessao: SessionUser,
  id: string,
): Promise<AvisoComId | null> {
  const doc = await getAdminDb().collection(COLECOES.avisos).doc(id).get();
  if (!doc.exists) return null;

  const aviso = { id: doc.id, ...(doc.data() as Aviso) };

  if (isEquipe(sessao.role)) return aviso;
  if (!aviso.ativo) return null;

  const contexto = await contextoDaSessao(sessao);
  return avisoEhPara(aviso.chave, contexto) ? aviso : null;
}

export async function lerAnexo(path: string): Promise<Buffer | null> {
  const arquivo = getAdminStorage().bucket().file(path);

  const [existe] = await arquivo.exists();
  if (!existe) return null;

  const [conteudo] = await arquivo.download();
  return conteudo;
}

function ordenar(avisos: AvisoComId[]): AvisoComId[] {
  return avisos.sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm));
}
