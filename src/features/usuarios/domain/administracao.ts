import { rotuloDoPerfil, type Role } from "@/core/auth/roles";
import type { UsuarioComId } from "@/core/modelo";

/**
 * As regras de quem pode mexer em qual conta.
 *
 * Administrar usuário é a operação que pode tirar o sistema das mãos de
 * quem o administra. As travas abaixo existem porque cada uma já aconteceu
 * em algum sistema: alguém se rebaixa sem querer, alguém desativa a si
 * mesmo e perde a tela, alguém desativa o último administrador e ninguém
 * consegue mais criar ninguém.
 */

export interface Impedimento {
  motivo: string;
}

/** Quantas contas de administração ativas existem. */
export function administradoresAtivos(usuarios: UsuarioComId[]): number {
  return usuarios.filter(
    (usuario) => usuario.role === "admin" && usuario.ativo !== false,
  ).length;
}

/**
 * Trocar o próprio papel é sempre recusado.
 *
 * Não é paternalismo: quem se rebaixa perde a tela no mesmo clique e passa
 * a depender de outra pessoa para voltar — e se for o único
 * administrador, de ninguém.
 */
export function impedimentoParaTrocarPapel(
  quemUid: string,
  alvo: UsuarioComId,
  novoPapel: Role,
  usuarios: UsuarioComId[],
): Impedimento | null {
  if (quemUid === alvo.id) {
    return { motivo: "Você não pode trocar o próprio perfil." };
  }

  if (alvo.role === novoPapel) {
    return { motivo: `Esta conta já é ${rotuloDoPerfil(novoPapel)}.` };
  }

  // Rebaixar o último administrador tranca o sistema: ninguém mais
  // consegue promover ninguém.
  if (
    alvo.role === "admin" &&
    novoPapel !== "admin" &&
    administradoresAtivos(usuarios) <= 1
  ) {
    return {
      motivo:
        "Esta é a única conta de administração ativa. Promova outra antes de rebaixar esta.",
    };
  }

  return null;
}

/**
 * Suspender e reativar acesso.
 *
 * Desativar a si mesmo derruba a própria sessão no clique seguinte, e a
 * pessoa fica fora de uma tela que só ela podia abrir.
 */
export function impedimentoParaSuspender(
  quemUid: string,
  alvo: UsuarioComId,
  usuarios: UsuarioComId[],
): Impedimento | null {
  if (quemUid === alvo.id) {
    return { motivo: "Você não pode suspender o próprio acesso." };
  }

  if (
    alvo.role === "admin" &&
    alvo.ativo !== false &&
    administradoresAtivos(usuarios) <= 1
  ) {
    return {
      motivo:
        "Esta é a única conta de administração ativa. Ative outra antes de suspender esta.",
    };
  }

  return null;
}

/**
 * O que a conta alcança, em uma linha.
 *
 * É o que responde "por que essa pessoa está vendo isso?" sem abrir o
 * cadastro dela — a pergunta que leva alguém a esta tela.
 */
export function resumoDoVinculo(usuario: UsuarioComId): string {
  if (usuario.matricula) return `Matrícula ${usuario.matricula}`;

  const filhos = usuario.alunosVinculados?.length ?? 0;
  if (filhos > 0) return filhos === 1 ? "1 aluno vinculado" : `${filhos} alunos vinculados`;

  const turmas = usuario.turmas?.length ?? 0;
  if (turmas > 0) return turmas === 1 ? "1 turma" : `${turmas} turmas`;

  return "Sem vínculo";
}

/**
 * Uma conta de família **sem vínculo nenhum** entra e não vê nada.
 *
 * É a falha mais comum do cadastro: a conta é criada, a pessoa recebe o
 * e-mail, entra, e a tela está vazia. A lista marca isso em vez de deixar
 * a descoberta para a ligação.
 */
export function semVinculoUtil(usuario: UsuarioComId): boolean {
  if (usuario.role === "aluno") return !usuario.matricula;
  if (usuario.role === "responsavel")
    return (usuario.alunosVinculados?.length ?? 0) === 0;
  if (usuario.role === "professor")
    return (usuario.turmas?.length ?? 0) === 0;

  return false;
}

/** Equipe primeiro, depois família; dentro de cada grupo, por nome. */
export function ordenarUsuarios(usuarios: UsuarioComId[]): UsuarioComId[] {
  const PESO: Record<Role, number> = {
    admin: 0,
    secretaria: 1,
    coordenacao: 2,
    financeiro: 3,
    professor: 4,
    responsavel: 5,
    aluno: 6,
  };

  return [...usuarios].sort(
    (a, b) =>
      PESO[a.role] - PESO[b.role] ||
      a.nome.localeCompare(b.nome, "pt-BR"),
  );
}
