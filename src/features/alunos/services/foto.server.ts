import "server-only";

import sharp from "sharp";

import { getAdminStorage } from "@/core/firebase/admin";
import { caminhoDaFoto, LADO_MAXIMO_PX } from "@/features/alunos/domain/foto";

/**
 * Gravação e leitura da foto do aluno no Cloud Storage.
 *
 * O arquivo **nunca fica público** e nenhuma URL assinada é gerada: a
 * imagem passa pela rota `/api/alunos/{matricula}/foto`, que verifica a
 * sessão. URL assinada vaza no momento em que alguém a encaminha — e aqui
 * se trata de foto de criança.
 */

export interface FotoProcessada {
  path: string;
  bytes: number;
}

/**
 * Processa e grava a imagem.
 *
 * Três coisas acontecem aqui, e nenhuma é cosmética:
 *
 * - **Remoção de metadados.** Foto de celular costuma trazer coordenada de
 *   GPS no EXIF. Guardar a localização de onde a criança foi fotografada,
 *   junto do nome dela, é pior do que guardar a foto. O `sharp` descarta o
 *   EXIF por padrão ao reencodar, e não pedimos `withMetadata()`.
 * - **Reencode para WebP.** Também garante que o que entrou é mesmo uma
 *   imagem: um arquivo disfarçado de JPEG falha aqui, antes de chegar ao
 *   bucket.
 * - **Redução para 600px.** A ficha não precisa de mais, e o arquivo cai de
 *   vários MB para dezenas de KB.
 */
export async function gravarFoto(
  matricula: string,
  arquivo: ArrayBuffer,
): Promise<FotoProcessada> {
  const processada = await sharp(Buffer.from(arquivo))
    .rotate() // respeita a orientação do EXIF antes de descartá-lo
    .resize(LADO_MAXIMO_PX, LADO_MAXIMO_PX, {
      fit: "cover",
      position: "attention", // enquadra pelo rosto, não pelo centro geométrico
    })
    .webp({ quality: 82 })
    .toBuffer();

  const path = caminhoDaFoto(matricula);

  await getAdminStorage()
    .bucket()
    .file(path)
    .save(processada, {
      contentType: "image/webp",
      // `private` deixa explícito o que já é o padrão do bucket. A proteção
      // real é não existir URL pública e a rota verificar a sessão.
      metadata: { cacheControl: "private, max-age=0, no-store" },
    });

  return { path, bytes: processada.length };
}

/** Lê a foto para a rota servir. `null` quando o aluno não tem foto. */
export async function lerFoto(path: string): Promise<Buffer | null> {
  const arquivo = getAdminStorage().bucket().file(path);

  const [existe] = await arquivo.exists();
  if (!existe) return null;

  const [conteudo] = await arquivo.download();
  return conteudo;
}

export async function removerFoto(path: string): Promise<void> {
  await getAdminStorage().bucket().file(path).delete({ ignoreNotFound: true });
}
