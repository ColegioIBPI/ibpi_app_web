import { chaveDeComparacao } from "@/features/migracao/domain/texto";

/**
 * Busca e classificação da listagem de responsáveis.
 *
 * Mesma abordagem da listagem de alunos: são 118 registros, então a
 * filtragem acontece em memória no servidor, o que permite buscar por
 * qualquer parte do nome, sem acento, e também por e-mail.
 */

export interface ResponsavelDaListagem {
  nome: string;
  email?: string | null;
  alunosVinculados: string[];
  uid?: string | null;
  ativo: boolean;
}

export type FiltroDeAcesso = "todos" | "com-conta" | "sem-conta" | "sem-filho";

export interface FiltroDeResponsaveis {
  termo?: string;
  acesso?: FiltroDeAcesso;
}

export function filtrarResponsaveis<T extends ResponsavelDaListagem>(
  responsaveis: readonly T[],
  filtro: FiltroDeResponsaveis = {},
): T[] {
  const termo = chaveDeComparacao(filtro.termo ?? "");
  const acesso = filtro.acesso ?? "todos";

  return responsaveis.filter((responsavel) => {
    if (acesso === "com-conta" && !temConta(responsavel)) return false;
    if (acesso === "sem-conta" && temConta(responsavel)) return false;
    if (acesso === "sem-filho" && responsavel.alunosVinculados.length > 0) {
      return false;
    }

    if (!termo) return true;

    return (
      chaveDeComparacao(responsavel.nome).includes(termo) ||
      chaveDeComparacao(responsavel.email ?? "").includes(termo)
    );
  });
}

export function temConta(responsavel: ResponsavelDaListagem): boolean {
  return Boolean(responsavel.uid);
}

/**
 * O responsável pode receber conta de acesso?
 *
 * Exige e-mail (é o login) e ao menos um filho vinculado — sem vínculo, a
 * pessoa entraria num portal vazio, e as Security Rules recusariam qualquer
 * consulta que ela tentasse.
 */
export function podeCriarConta(responsavel: ResponsavelDaListagem): boolean {
  return (
    !temConta(responsavel) &&
    Boolean(responsavel.email) &&
    responsavel.alunosVinculados.length > 0
  );
}

/** Explica o que falta, para a tela não só desabilitar o botão em silêncio. */
export function motivoParaNaoCriarConta(
  responsavel: ResponsavelDaListagem,
): string | null {
  if (temConta(responsavel)) return "Este responsável já tem acesso.";
  if (!responsavel.email) {
    return "Cadastre um e-mail: é com ele que o responsável entra no Portal.";
  }
  if (responsavel.alunosVinculados.length === 0) {
    return "Vincule ao menos um aluno antes de criar o acesso — sem vínculo, o Portal aparece vazio.";
  }
  return null;
}

export function ordenarPorNome<T extends ResponsavelDaListagem>(
  responsaveis: readonly T[],
): T[] {
  return [...responsaveis].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
  );
}
