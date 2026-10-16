/**
 * Regras do arquivo de boleto.
 *
 * Só PDF: é o que o banco emite, é o que abre em qualquer celular, e é o
 * que imprime igual ao original. Foto de boleto tirada de tela costuma
 * cortar a linha digitável, e o código de barras fotografado não lê no
 * caixa — aceitar imagem aqui seria aceitar um arquivo que falha na hora
 * de pagar.
 */

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
