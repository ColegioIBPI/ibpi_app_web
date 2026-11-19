/**
 * O número de matrícula de um aluno novo.
 *
 * É a chave de meia dúzia de coleções — notas, boletim, credenciais,
 * boleto, conferência de documentos — e o que a família escreve no
 * formulário do colégio. Ele **nunca se repete**, nem quando o aluno sai:
 * reaproveitar um número faria o histórico de quem saiu colar no aluno
 * novo, e esse é o tipo de erro que só aparece no dia da segunda via.
 *
 * O formato é o que o colégio já usa, confirmado nos 73 cadastros
 * migrados do Access: **dois dígitos do ano de ingresso e três do
 * sequencial** — `26007` é o sétimo aluno a entrar em 2026.
 */

/** Quantos dígitos tem o sequencial. Três dão 999 alunos por ano. */
const DIGITOS = 3;

export function formatarMatricula(anoLetivo: number, sequencial: number): string {
  const ano = String(anoLetivo).slice(-2);

  return `${ano}${String(sequencial).padStart(DIGITOS, "0")}`;
}

/** O prefixo das matrículas de um ano: `2026` → `"26"`. */
export function prefixoDoAno(anoLetivo: number): string {
  return String(anoLetivo).slice(-2);
}

/**
 * O sequencial dentro de uma matrícula, ou `null` se não for do formato.
 *
 * O cadastro migrado tem `QA-0001` e pode ganhar outros fora do padrão —
 * ler isso como número daria um sequencial absurdo e queimaria a faixa
 * inteira do ano.
 */
export function sequencialDaMatricula(
  matricula: string,
  anoLetivo: number,
): number | null {
  const prefixo = prefixoDoAno(anoLetivo);

  if (!new RegExp(`^${prefixo}\\d{${DIGITOS}}$`).test(matricula)) return null;

  return Number(matricula.slice(prefixo.length));
}

/**
 * O próximo número, dado o contador e a maior matrícula já existente.
 *
 * **Os dois, e o maior ganha.** O contador é o caminho rápido e é quem
 * garante que número usado não volta — ele não recua quando um aluno é
 * excluído. O maior existente é o piso: ele conserta o contador perdido,
 * o ano que começou antes de o contador existir (é o caso de 2026, com
 * 73 alunos migrados) e qualquer aluno criado fora desta tela.
 *
 * Sem o piso, a primeira criação de 2026 tentaria `26001` e bateria num
 * aluno que já existe.
 */
export function proximoSequencial(
  contador: number | null | undefined,
  maiorExistente: number | null | undefined,
): number {
  return Math.max(contador ?? 1, (maiorExistente ?? 0) + 1);
}
