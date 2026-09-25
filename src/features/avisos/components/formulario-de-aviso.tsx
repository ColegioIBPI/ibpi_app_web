"use client";

import { Paperclip, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  type Destino,
} from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { TextField } from "@/core/ui/field";
import {
  montarDestino,
  opcoesDoTipo,
  SeletorDeDestino,
  type OpcaoDeDestino,
} from "@/core/ui/seletor-de-destino";
import { publicarAviso } from "@/features/avisos/actions/avisos";
import {
  ANEXOS_POR_AVISO,
  formatar,
  TAMANHO_MAXIMO_DE_ANEXO,
  validarAnexo,
} from "@/features/avisos/domain/anexo";

interface FormularioDeAvisoProps {
  destinosPermitidos: Destino["tipo"][];
  turmas: OpcaoDeDestino[];
  alunos: OpcaoDeDestino[];
  responsaveis: OpcaoDeDestino[];
}

export function FormularioDeAviso({
  destinosPermitidos,
  turmas,
  alunos,
  responsaveis,
}: FormularioDeAvisoProps) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);

  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [tipo, setTipo] = useState<Destino["tipo"]>(destinosPermitidos[0]);
  const [alvo, setAlvo] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const opcoes = opcoesDoTipo(tipo, turmas, alunos, responsaveis);
  const precisaDeAlvo = tipo !== "todos";

  function adicionar(lista: FileList | null) {
    if (!lista) return;
    setErro(null);

    const novos: File[] = [];
    for (const arquivo of Array.from(lista)) {
      const validacao = validarAnexo(arquivo);
      if (!validacao.ok) {
        setErro(validacao.erro ?? "Anexo inválido.");
        continue;
      }
      novos.push(arquivo);
    }

    const total = [...arquivos, ...novos].slice(0, ANEXOS_POR_AVISO);
    if (arquivos.length + novos.length > ANEXOS_POR_AVISO) {
      setErro(`No máximo ${ANEXOS_POR_AVISO} anexos por aviso.`);
    }

    setArquivos(total);
    if (entrada.current) entrada.current.value = "";
  }

  async function enviar() {
    setErro(null);

    if (precisaDeAlvo && !alvo) {
      setErro("Escolha para quem é o aviso.");
      return;
    }

    const destino = montarDestino(tipo, alvo, opcoes);
    if (!destino) {
      setErro("Escolha para quem é o aviso.");
      return;
    }

    setEnviando(true);

    try {
      const dados = new FormData();
      for (const arquivo of arquivos) dados.append("anexos", arquivo);

      const resultado = await publicarAviso(
        { titulo, corpo, destino },
        arquivos.length > 0 ? dados : null,
      );

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível publicar.");
        return;
      }

      router.push(`/gestao/avisos/${resultado.id}`);
      router.refresh();
    } catch {
      setErro(
        "O envio foi interrompido. Verifique a conexão e tente de novo com anexos menores.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {erro && (
        <p
          role="alert"
          className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}

      <Card title="Para quem">
        <SeletorDeDestino
          tipos={destinosPermitidos}
          tipo={tipo}
          alvo={alvo}
          turmas={turmas}
          alunos={alunos}
          responsaveis={responsaveis}
          onTipo={setTipo}
          onAlvo={setAlvo}
        />
      </Card>

      <Card title="Mensagem">
        <div className="grid gap-4">
          <TextField
            label="Título"
            required
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="corpo" className="text-ink text-sm font-medium">
              Texto
            </label>
            <textarea
              id="corpo"
              rows={6}
              value={corpo}
              onChange={(evento) => setCorpo(evento.target.value)}
              className="border-line bg-surface text-ink placeholder:text-ink-muted w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Card>

      <Card title="Anexos" description="PDF ou imagem, opcional.">
        <div className="flex flex-col gap-3">
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => entrada.current?.click()}
              disabled={arquivos.length >= ANEXOS_POR_AVISO}
            >
              <Paperclip className="size-4" aria-hidden />
              Adicionar anexo
            </Button>
            <p className="text-ink-muted mt-2 text-xs">
              Até {ANEXOS_POR_AVISO} arquivos, de{" "}
              {formatar(TAMANHO_MAXIMO_DE_ANEXO)} cada.
            </p>
          </div>

          <input
            ref={entrada}
            type="file"
            multiple
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Arquivos do anexo"
            onChange={(evento) => adicionar(evento.target.files)}
          />

          {arquivos.length > 0 && (
            <ul className="divide-line divide-y text-sm">
              {arquivos.map((arquivo, indice) => (
                <li
                  key={`${arquivo.name}-${indice}`}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="text-ink truncate">{arquivo.name}</span>
                  <span className="text-ink-muted shrink-0 text-xs">
                    {formatar(arquivo.size)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remover ${arquivo.name}`}
                    onClick={() =>
                      setArquivos(arquivos.filter((_, i) => i !== indice))
                    }
                    className="text-ink-muted hover:text-danger shrink-0"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button onClick={enviar} loading={enviando}>
          <Send className="size-4" aria-hidden />
          Publicar
        </Button>
      </div>
    </div>
  );
}
