import {
  chaveDeComparacao,
  extrairEmail,
  normalizarCpf,
  normalizarNome,
  normalizarTelefone,
} from "@/features/migracao/domain/texto";

/**
 * Montagem dos responsáveis a partir do cadastro do aluno.
 *
 * O Access guarda dois responsáveis em colunas do próprio aluno
 * (`Responsavel`/`Parentesco1` e `Responsavel1`/`Parentesco2`), sem tabela
 * própria. Isso cria um problema na migração: **irmãos duplicam o mesmo
 * responsável**, e às vezes com o nome grafado diferente — na base real há
 * "Sharisy Colavitti Antunes" e "Sarisy Colavitti Antunes", a mesma mãe de
 * dois alunos, com o mesmo e-mail.
 *
 * A saída é uma chave de identidade estável, para os dois cadastros virarem
 * um responsável só, com os dois filhos vinculados.
 */

export interface ResponsavelBruto {
  nome: unknown;
  parentesco: unknown;
  email: unknown;
  telefone?: unknown;
  cpf?: unknown;
}

export interface Responsavel {
  /** Id do documento, derivado da identidade. */
  id: string;
  nome: string;
  parentesco: string | null;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
}

/**
 * Identidade do responsável, em ordem de confiabilidade.
 *
 * O e-mail vem primeiro porque é o que vai virar login — dois cadastros com
 * o mesmo e-mail são obrigatoriamente a mesma pessoa. O CPF é igualmente
 * forte, mas está preenchido em menos registros. O nome é o último recurso e
 * o mais frágil, justamente por causa das grafias divergentes.
 */
export function chaveDoResponsavel(bruto: ResponsavelBruto): string | null {
  const email = extrairEmail(bruto.email);
  if (email) return `email:${email}`;

  const cpf = normalizarCpf(bruto.cpf);
  if (cpf) return `cpf:${cpf}`;

  const nome = chaveDeComparacao(bruto.nome);
  if (nome) return `nome:${nome}`;

  return null;
}

/** Id de documento a partir da chave, sem caractere problemático. */
export function idDoResponsavel(chave: string): string {
  return chave
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 120);
}

export function montarResponsavel(bruto: ResponsavelBruto): Responsavel | null {
  const chave = chaveDoResponsavel(bruto);
  const nome = normalizarNome(bruto.nome);

  // Sem nome não há responsável — é o campo que a secretaria usa para achar
  // a pessoa, e um registro só com e-mail seria inútil na tela.
  if (!chave || !nome) return null;

  return {
    id: idDoResponsavel(chave),
    nome,
    parentesco: normalizarNome(bruto.parentesco),
    email: extrairEmail(bruto.email),
    telefone: normalizarTelefone(bruto.telefone),
    cpf: normalizarCpf(bruto.cpf),
  };
}

/**
 * Junta o mesmo responsável vindo de alunos diferentes.
 *
 * Quando dois registros têm a mesma identidade, o que tiver mais campos
 * preenchidos prevalece — assim o cadastro do irmão completa o do outro em
 * vez de sobrescrever com um registro mais pobre.
 */
export function consolidarResponsaveis(
  registros: readonly Responsavel[],
): Responsavel[] {
  const porId = new Map<string, Responsavel>();

  for (const registro of registros) {
    const existente = porId.get(registro.id);

    if (!existente) {
      porId.set(registro.id, registro);
      continue;
    }

    porId.set(registro.id, {
      ...existente,
      nome:
        preenchidos(registro) > preenchidos(existente)
          ? registro.nome
          : existente.nome,
      parentesco: existente.parentesco ?? registro.parentesco,
      email: existente.email ?? registro.email,
      telefone: existente.telefone ?? registro.telefone,
      cpf: existente.cpf ?? registro.cpf,
    });
  }

  return [...porId.values()];
}

function preenchidos(responsavel: Responsavel): number {
  return [
    responsavel.parentesco,
    responsavel.email,
    responsavel.telefone,
    responsavel.cpf,
  ].filter(Boolean).length;
}
