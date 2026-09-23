import type { Role } from "@/core/auth/roles";
import type { Destino, Segmento } from "@/core/modelo";

/**
 * Quem recebe qual aviso.
 *
 * Toda a regra de alcance vive aqui, pura: a consulta ao banco só monta a
 * lista de chaves que esta função calcula. Deixar o alcance espalhado entre
 * a consulta e a tela é a forma mais rápida de um aviso individual aparecer
 * para a escola inteira.
 */

/** O que se sabe sobre a pessoa que está olhando os avisos. */
export interface ContextoDoDestinatario {
  role: Role;
  /** Matrícula, quando é aluno. */
  matricula?: string | null;
  /** Matrículas dos filhos, quando é responsável. */
  alunosVinculados?: string[];
  /** Id do cadastro em `responsaveis`, quando é responsável. */
  responsavelId?: string | null;
  /** Turmas dos alunos que a pessoa acompanha (ou a própria, se for aluno). */
  turmas?: string[];
  /** Segmentos correspondentes. */
  segmentos?: Segmento[];
}

/**
 * Chaves de aviso que alcançam esta pessoa.
 *
 * É a lista usada em `where("chave", "in", ...)`. O Firestore aceita até 30
 * valores; um responsável com muitos filhos é o caso extremo, e mesmo ele
 * fica bem abaixo disso.
 */
export function chavesDoDestinatario(
  contexto: ContextoDoDestinatario,
): string[] {
  const chaves = new Set<string>(["todos"]);

  for (const segmento of contexto.segmentos ?? []) {
    chaves.add(`segmento:${segmento}`);
  }

  for (const turma of contexto.turmas ?? []) {
    chaves.add(`turma:${turma}`);
  }

  if (contexto.role === "aluno" && contexto.matricula) {
    chaves.add(`aluno:${contexto.matricula}`);
  }

  if (contexto.role === "responsavel") {
    // O responsável recebe o que foi endereçado a ele **e** o que foi
    // endereçado a cada filho: quem avisa "o aluno tal faltou" espera que a
    // família leia.
    for (const matricula of contexto.alunosVinculados ?? []) {
      chaves.add(`aluno:${matricula}`);
    }

    if (contexto.responsavelId) {
      chaves.add(`responsavel:${contexto.responsavelId}`);
    }
  }

  return [...chaves];
}

/**
 * O aviso alcança esta pessoa?
 *
 * Usada para verificar o acesso a um aviso específico — inclusive ao baixar
 * um anexo, onde a consulta por chave não passa.
 */
export function avisoEhPara(
  chaveDoAviso: string,
  contexto: ContextoDoDestinatario,
): boolean {
  return chavesDoDestinatario(contexto).includes(chaveDoAviso);
}

/** Limite do operador `in` do Firestore. */
export const LIMITE_DE_CHAVES = 30;

/**
 * Divide as chaves em lotes que o Firestore aceita.
 *
 * Passar de 30 é improvável, mas silenciosamente perder avisos porque o
 * responsável tem muitos filhos seria o tipo de falha que ninguém percebe.
 */
export function lotesDeChaves(chaves: readonly string[]): string[][] {
  const lotes: string[][] = [];

  for (let i = 0; i < chaves.length; i += LIMITE_DE_CHAVES) {
    lotes.push(chaves.slice(i, i + LIMITE_DE_CHAVES));
  }

  return lotes.length > 0 ? lotes : [["todos"]];
}

/**
 * O perfil pode publicar para este destino?
 *
 * Permissão diz que o professor publica avisos; **isto** diz que ele publica
 * para as turmas dele, e não para a escola inteira. É a mesma separação
 * entre permissão e escopo que vale no resto do sistema.
 */
export function podePublicarPara(
  role: Role,
  destino: Destino,
  turmasDoProfessor: readonly string[] = [],
): { ok: boolean; erro?: string } {
  if (role === "secretaria" || role === "coordenacao") return { ok: true };

  if (role === "professor") {
    if (destino.tipo === "turma") {
      return turmasDoProfessor.includes(destino.turmaId)
        ? { ok: true }
        : {
            ok: false,
            erro: `Você não leciona na turma ${destino.turmaCodigo}.`,
          };
    }

    if (destino.tipo === "aluno") return { ok: true };

    return {
      ok: false,
      erro: "Professor publica para as próprias turmas ou para um aluno.",
    };
  }

  if (role === "financeiro") {
    // Cobrança é assunto de quem paga. Avisar a escola inteira sobre
    // mensalidade não é papel do setor financeiro.
    if (destino.tipo === "responsavel" || destino.tipo === "aluno") {
      return { ok: true };
    }

    return {
      ok: false,
      erro: "O setor financeiro publica para um responsável ou um aluno.",
    };
  }

  return { ok: false, erro: "Seu perfil não publica avisos." };
}

/** Destinos que o perfil pode escolher na tela. */
export function destinosPermitidos(role: Role): Destino["tipo"][] {
  if (role === "secretaria" || role === "coordenacao") {
    return ["todos", "segmento", "turma", "aluno", "responsavel"];
  }

  if (role === "professor") return ["turma", "aluno"];
  if (role === "financeiro") return ["responsavel", "aluno"];

  return [];
}
