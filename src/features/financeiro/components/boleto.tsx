"use client";

import { Download, FileText, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { formatDate } from "@/core/lib/format";
import type { Boleto } from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { TextField } from "@/core/ui/field";
import {
  removerBoleto,
  salvarBoleto,
} from "@/features/financeiro/actions/boleto";
import { emMB, validarBoleto } from "@/features/financeiro/domain/boleto";

/**
 * Envio do boleto, para quem cuida do caixa.
 *
 * O arquivo é validado **na tela antes de subir**: mandar 5 MB pelo 4G da
 * secretaria para receber "não é PDF" é a pior forma de descobrir o erro.
 * O servidor valida de novo, porque a tela é substituível.
 */
export function BoletoDoAluno({
  matricula,
  boleto,
}: {
  matricula: string;
  boleto: Boleto | null;
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [observacoes, setObservacoes] = useState(boleto?.observacoes ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  function escolher(selecionado: File | null) {
    setErro(null);

    if (!selecionado) return setArquivo(null);

    const validacao = validarBoleto({
      type: selecionado.type,
      size: selecionado.size,
      name: selecionado.name,
    });

    if (!validacao.ok) {
      setArquivo(null);
      if (entrada.current) entrada.current.value = "";
      return setErro(validacao.erro ?? null);
    }

    setArquivo(selecionado);
  }

  async function enviar() {
    if (!arquivo) return;

    setErro(null);
    setOcupado("enviar");

    try {
      const formulario = new FormData();
      formulario.set("matricula", matricula);
      formulario.set("arquivo", arquivo);
      formulario.set("observacoes", observacoes);

      const resultado = await salvarBoleto(formulario);

      if (!resultado.ok) {
        return setErro(resultado.erro ?? "Não foi possível enviar.");
      }

      setArquivo(null);
      if (entrada.current) entrada.current.value = "";
      router.refresh();
    } finally {
      setOcupado(null);
    }
  }

  async function remover() {
    setErro(null);
    setOcupado("remover");

    try {
      const resultado = await removerBoleto(matricula);

      if (!resultado.ok) {
        return setErro(resultado.erro ?? "Não foi possível remover.");
      }
      router.refresh();
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {erro && (
        <p
          role="alert"
          className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}

      {boleto?.arquivo ? (
        <div className="border-line flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
          <span className="flex items-center gap-2 text-sm">
            <FileText className="text-brand-600 size-5 shrink-0" aria-hidden />
            <span>
              <a
                href={`/api/alunos/${matricula}/boleto`}
                className="text-brand-600 font-medium hover:underline"
              >
                {boleto.arquivo.nome}
              </a>
              <span className="text-ink-muted block text-xs">
                {emMB(boleto.arquivo.tamanho)}
                {boleto.atualizadoPorNome
                  ? ` · enviado por ${boleto.atualizadoPorNome}`
                  : ""}
                {boleto.atualizadoEm
                  ? ` em ${formatDate(boleto.atualizadoEm)}`
                  : ""}
              </span>
            </span>
          </span>

          <Button
            variant="ghost"
            size="sm"
            loading={ocupado === "remover"}
            onClick={remover}
          >
            <Trash2 className="size-4" aria-hidden />
            Remover
          </Button>
        </div>
      ) : (
        <p className="text-ink-muted text-sm">
          Nenhum boleto enviado. A família não vê nada no aplicativo até você
          enviar um.
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="boleto" className="text-ink text-sm font-medium">
          {boleto?.arquivo ? "Substituir o boleto" : "Enviar o boleto"}
        </label>
        <input
          ref={entrada}
          id="boleto"
          type="file"
          accept="application/pdf"
          className="text-ink text-sm"
          onChange={(evento) => escolher(evento.target.files?.[0] ?? null)}
        />
        <p className="text-ink-muted text-xs">
          Só PDF, até 5 MB. É <strong>um por aluno</strong>: enviar outro
          substitui o atual.
        </p>
      </div>

      <TextField
        label="Observações"
        hint="Opcional. A família lê este texto junto do boleto."
        value={observacoes}
        onChange={(evento) => setObservacoes(evento.target.value)}
      />

      <div className="flex justify-end">
        <Button
          onClick={enviar}
          loading={ocupado === "enviar"}
          disabled={!arquivo}
        >
          <Upload className="size-4" aria-hidden />
          {boleto?.arquivo ? "Substituir" : "Enviar"}
        </Button>
      </div>
    </div>
  );
}

/** O boleto, do lado da família: um botão de baixar e o recado. */
export function BoletoDaFamilia({
  matricula,
  boleto,
}: {
  matricula: string;
  boleto: Boleto | null;
}) {
  if (!boleto?.arquivo) return null;

  return (
    <div className="border-line bg-surface-subtle mb-4 rounded-md border p-3">
      <h3 className="text-ink text-sm font-medium">Boleto</h3>

      {boleto.observacoes && (
        <p className="text-ink mt-1 text-sm">{boleto.observacoes}</p>
      )}

      <a
        href={`/api/alunos/${matricula}/boleto`}
        className="text-brand-600 mt-2 inline-flex items-center gap-1.5 text-sm hover:underline"
      >
        <Download className="size-4" aria-hidden />
        Baixar {boleto.arquivo.nome}
        <span className="text-ink-muted">({emMB(boleto.arquivo.tamanho)})</span>
      </a>
    </div>
  );
}
