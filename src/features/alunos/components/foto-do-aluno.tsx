import Image from "next/image";

import { cn } from "@/core/lib/cn";
import { iniciaisDoNome, urlDaFoto } from "@/features/alunos/domain/foto";

interface FotoDoAlunoProps {
  matricula: string;
  nome: string;
  fotoPath?: string | null;
  fotoAtualizadaEm?: string | null;
  tamanho?: number;
  className?: string;
}

/**
 * Foto do aluno, ou as iniciais quando não há imagem.
 *
 * A imagem vem da rota autenticada, não do bucket — ver
 * `domain/foto.ts`. O `unoptimized` evita que o otimizador do Next
 * guarde uma cópia da foto em cache de disco no servidor: a imagem já sai
 * pronta em 600px e WebP, e um dado pessoal a menos circulando é melhor.
 */
export function FotoDoAluno({
  matricula,
  nome,
  fotoPath,
  fotoAtualizadaEm,
  tamanho = 96,
  className,
}: FotoDoAlunoProps) {
  const classes = cn(
    "bg-surface-subtle border-line shrink-0 overflow-hidden rounded-full border object-cover",
    className,
  );

  if (!fotoPath) {
    return (
      <div
        className={cn(
          classes,
          "text-ink-muted flex items-center justify-center font-medium",
        )}
        style={{ width: tamanho, height: tamanho, fontSize: tamanho / 3 }}
        aria-hidden
      >
        {iniciaisDoNome(nome)}
      </div>
    );
  }

  return (
    <Image
      src={urlDaFoto(matricula, fotoAtualizadaEm)}
      alt={`Foto de ${nome}`}
      width={tamanho}
      height={tamanho}
      unoptimized
      className={classes}
      style={{ width: tamanho, height: tamanho }}
    />
  );
}
