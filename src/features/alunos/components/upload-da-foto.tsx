"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/core/ui/button";
import {
  enviarFotoDoAluno,
  removerFotoDoAluno,
} from "@/features/alunos/actions/foto";
import {
  formatarTamanho,
  TAMANHO_MAXIMO_BYTES,
  validarFoto,
} from "@/features/alunos/domain/foto";
import { FotoDoAluno } from "@/features/alunos/components/foto-do-aluno";

interface UploadDaFotoProps {
  matricula: string;
  nome: string;
  fotoPath?: string | null;
  fotoAtualizadaEm?: string | null;
}

export function UploadDaFoto({
  matricula,
  nome,
  fotoPath,
  fotoAtualizadaEm,
}: UploadDaFotoProps) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<"envio" | "remocao" | null>(null);

  async function aoEscolher(arquivo: File | undefined) {
    if (!arquivo) return;

    setErro(null);

    // Valida antes de enviar: recusar um arquivo de 20 MB só depois do
    // upload gasta o tempo da secretaria à toa.
    const validacao = validarFoto(arquivo);
    if (!validacao.ok) {
      setErro(validacao.erro ?? "Imagem inválida.");
      limparEntrada();
      return;
    }

    setOcupado("envio");

    const dados = new FormData();
    dados.append("foto", arquivo);

    try {
      const resultado = await enviarFotoDoAluno(matricula, dados);

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível enviar a foto.");
        return;
      }

      router.refresh();
    } catch {
      // Falha antes de a ação rodar — rede caindo no meio do upload, ou o
      // limite de tamanho do servidor. Sem este catch a promessa rejeitava
      // em silêncio e a tela não dizia nada.
      setErro(
        "O envio foi interrompido. Verifique a conexão e tente de novo com uma imagem menor.",
      );
    } finally {
      setOcupado(null);
      limparEntrada();
    }
  }

  async function remover() {
    setErro(null);
    setOcupado("remocao");

    try {
      const resultado = await removerFotoDoAluno(matricula);

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível remover a foto.");
        return;
      }

      router.refresh();
    } catch {
      setErro("Não foi possível remover a foto. Tente de novo.");
    } finally {
      setOcupado(null);
    }
  }

  function limparEntrada() {
    if (entrada.current) entrada.current.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <FotoDoAluno
          matricula={matricula}
          nome={nome}
          fotoPath={fotoPath}
          fotoAtualizadaEm={fotoAtualizadaEm}
          tamanho={96}
        />

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => entrada.current?.click()}
              loading={ocupado === "envio"}
            >
              <Camera className="size-4" aria-hidden />
              {fotoPath ? "Trocar foto" : "Enviar foto"}
            </Button>

            {fotoPath && (
              <Button
                variant="ghost"
                size="sm"
                onClick={remover}
                loading={ocupado === "remocao"}
              >
                <Trash2 className="size-4" aria-hidden />
                Remover
              </Button>
            )}
          </div>

          <p className="text-ink-muted text-xs">
            JPG, PNG, WebP ou HEIC, até {formatarTamanho(TAMANHO_MAXIMO_BYTES)}.
            A imagem é reduzida e os metadados de localização são removidos.
          </p>
        </div>
      </div>

      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        aria-label="Arquivo da foto"
        onChange={(evento) => aoEscolher(evento.target.files?.[0])}
      />

      {erro && (
        <p
          role="alert"
          className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}
    </div>
  );
}
