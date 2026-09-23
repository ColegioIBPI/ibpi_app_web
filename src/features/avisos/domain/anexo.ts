/**
 * Regras do anexo de aviso.
 *
 * Circular digitalizada, calendário, cardápio. Como a foto do aluno, o
 * arquivo **não fica público**: é servido por uma rota que confere se o
 * aviso é mesmo para quem está pedindo.
 */

export const TIPOS_DE_ANEXO = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** 10 MB — circular digitalizada em PDF chega perto disso. */
export const TAMANHO_MAXIMO_DE_ANEXO = 10 * 1024 * 1024;

/** Mais que isso vira pasta, não aviso. */
export const ANEXOS_POR_AVISO = 5;

export interface ArquivoDeAnexo {
  type: string;
  size: number;
  name?: string;
}

export function validarAnexo(arquivo: ArquivoDeAnexo): {
  ok: boolean;
  erro?: string;
} {
  if (!(TIPOS_DE_ANEXO as readonly string[]).includes(arquivo.type)) {
    return {
      ok: false,
      erro: `"${arquivo.name ?? "arquivo"}" não é PDF nem imagem.`,
    };
  }

  if (arquivo.size > TAMANHO_MAXIMO_DE_ANEXO) {
    return {
      ok: false,
      erro: `"${arquivo.name ?? "arquivo"}" tem ${formatar(arquivo.size)}; o limite é ${formatar(TAMANHO_MAXIMO_DE_ANEXO)}.`,
    };
  }

  return { ok: true };
}

export function formatar(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1
    ? `${mb.toFixed(1).replace(".", ",")} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

/** Endereço do anexo — sempre pela rota, nunca pelo bucket. */
export function urlDoAnexo(avisoId: string, indice: number): string {
  return `/api/avisos/${avisoId}/anexo/${indice}`;
}

export function ehImagem(tipo: string): boolean {
  return tipo.startsWith("image/");
}
