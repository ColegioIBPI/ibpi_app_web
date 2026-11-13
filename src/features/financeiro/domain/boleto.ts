import { isEquipe, pode, type Role } from "@/core/auth/roles";

/**
 * Regras do boleto: quem pode vê-lo, e que arquivo é aceito.
 *
 * Só PDF: é o que o banco emite, é o que abre em qualquer celular, e é o
 * que imprime igual ao original. Foto de boleto tirada de tela costuma
 * cortar a linha digitável, e o código de barras fotografado não lê no
 * caixa — aceitar imagem aqui seria aceitar um arquivo que falha na hora
 * de pagar.
 */

/**
 * Quem enxerga o boleto de um aluno.
 *
 * A família vê o dos filhos; quem tem o recurso financeiro vê o de todos.
 * **O aluno não** — mensalidade é assunto de quem paga, e é a mesma regra
 * que já vale para o extrato.
 *
 * Duas coisas que a forma desta função guarda:
 *
 * 1. **Do lado da equipe a pergunta é `financeiro: ler`, não "é equipe".**
 *    Era `isEquipe`, e isso servia o PDF ao professor, que a regra do
 *    Firestore nega há tempo: a rota que entrega o arquivo usa o Admin
 *    SDK, que **ignora as regras**, então quem repete o recorte é esta
 *    linha. Com a coordenação saindo do financeiro, o mesmo descompasso
 *    passaria a valer para ela e para o inspetor.
 * 2. **Do lado da família a pergunta é o vínculo.** `pode` diria sim para
 *    qualquer responsável, inclusive o de outro aluno.
 */
export function podeVerBoleto(
  sessao: { role: Role; alunosVinculados: string[] },
  matricula: string,
): boolean {
  if (sessao.role === "aluno") return false;

  if (isEquipe(sessao.role)) {
    return pode(sessao.role, "financeiro", "ler");
  }

  return sessao.alunosVinculados.includes(matricula);
}

export const TIPO_DO_BOLETO = "application/pdf";

/** 5 MB. Boleto tem uma ou duas páginas; acima disso é outra coisa. */
export const TAMANHO_MAXIMO_DO_BOLETO = 5 * 1024 * 1024;

export interface ArquivoDeBoleto {
  type: string;
  size: number;
  name?: string;
}

export function validarBoleto(arquivo: ArquivoDeBoleto): {
  ok: boolean;
  erro?: string;
} {
  if (arquivo.type !== TIPO_DO_BOLETO) {
    return {
      ok: false,
      erro: `"${arquivo.name ?? "arquivo"}" não é PDF. O boleto precisa ser o PDF do banco.`,
    };
  }

  if (arquivo.size === 0) {
    return { ok: false, erro: "O arquivo está vazio." };
  }

  if (arquivo.size > TAMANHO_MAXIMO_DO_BOLETO) {
    return {
      ok: false,
      erro: `O arquivo tem ${emMB(arquivo.size)}; o limite é ${emMB(TAMANHO_MAXIMO_DO_BOLETO)}.`,
    };
  }

  return { ok: true };
}

export function emMB(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1
    ? `${mb.toFixed(1).replace(".", ",")} MB`
    : `${Math.round(bytes / 1024)} KB`;
}
