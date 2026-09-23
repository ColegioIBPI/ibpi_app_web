/**
 * Regras da foto do aluno.
 *
 * Foto de aluno é **dado pessoal de menor de idade**, e isso define duas
 * coisas que não são negociáveis:
 *
 * 1. O arquivo **nunca fica público**. Não há URL adivinhável nem bucket
 *    aberto; a imagem é servida por uma rota que verifica a sessão e o
 *    escopo de quem pede, do mesmo jeito que o cadastro.
 * 2. Os **metadados são removidos** no processamento. Foto de celular
 *    costuma carregar coordenada de GPS no EXIF — publicar isso junto com o
 *    nome de uma criança é pior do que publicar a foto.
 *
 * Este arquivo tem só a parte pura: validação e nomes. O processamento e a
 * gravação estão em `services/foto.server.ts`.
 */

/** Formatos que o navegador envia e que sabemos processar. */
export const TIPOS_ACEITOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

/**
 * 8 MB. Foto de celular moderno passa de 5 MB, e recusar o que a secretaria
 * acabou de tirar seria irritante. O arquivo guardado é bem menor — o
 * processamento reduz para 600px.
 */
export const TAMANHO_MAXIMO_BYTES = 8 * 1024 * 1024;

/** Lado maior da imagem guardada. Suficiente para a ficha e para impressão. */
export const LADO_MAXIMO_PX = 600;

export interface ArquivoRecebido {
  type: string;
  size: number;
  name?: string;
}

export interface Validacao {
  ok: boolean;
  erro?: string;
}

export function validarFoto(arquivo: ArquivoRecebido | null): Validacao {
  if (!arquivo || arquivo.size === 0) {
    return { ok: false, erro: "Escolha uma imagem." };
  }

  if (!(TIPOS_ACEITOS as readonly string[]).includes(arquivo.type)) {
    return {
      ok: false,
      erro: "Formato não aceito. Envie JPG, PNG, WebP ou HEIC.",
    };
  }

  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return {
      ok: false,
      erro: `A imagem tem ${formatarTamanho(arquivo.size)}; o limite é ${formatarTamanho(TAMANHO_MAXIMO_BYTES)}.`,
    };
  }

  return { ok: true };
}

/**
 * Caminho do arquivo no Storage.
 *
 * Fica sob a matrícula, e não sob um nome aleatório, para a pasta do bucket
 * continuar legível por quem precisar auditar o que está guardado.
 */
export function caminhoDaFoto(matricula: string): string {
  return `alunos/${matricula}/foto.webp`;
}

export function formatarTamanho(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1
    ? `${mb.toFixed(1).replace(".", ",")} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

/**
 * Endereço pelo qual a tela pede a foto.
 *
 * O `v` muda quando a foto é trocada: sem ele, o navegador continuaria
 * mostrando a imagem antiga do cache depois de a secretaria substituí-la.
 */
export function urlDaFoto(
  matricula: string,
  atualizadaEm?: string | null,
): string {
  const versao = atualizadaEm ? `?v=${encodeURIComponent(atualizadaEm)}` : "";
  return `/api/alunos/${matricula}/foto${versao}`;
}

/** Iniciais para o lugar da foto quando não há imagem. */
export function iniciaisDoNome(nome: string): string {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((parte) => parte.length > 2 || /^[A-ZÀ-Ý]/.test(parte));

  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}
